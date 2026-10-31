import type { PoolClient } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { one, rows } from "./tx";
import { logEvent, logApproval } from "./events";
import { startAgent } from "./agents";
import { getBlockers } from "./publish-rules";
import { PERSON_NAME, type Person } from "@/db/seed";

type Result = { ok: true; message: string } | { ok: false; status: number; message: string };

// Restart: always available, even while an agent is working or waiting on a human.
// The old run's open proposals are superseded, its working memory is cleared, and a fresh
// run starts from the database using the current decision versions.
export async function restartAgent(c: PoolClient, who: Person, agentId: "copy" | "pricing"): Promise<Result> {
  const a = await one<any>(c, `SELECT * FROM agents WHERE id = $1 FOR UPDATE`, [agentId]);
  if (!a) return { ok: false, status: 404, message: "That agent does not exist." };
  const oldRun = a.run_id as string | null;
  if (oldRun) {
    await c.query(
      `UPDATE proposals SET status = 'superseded', stale_reason = COALESCE(stale_reason, 'Replaced by a restart.'), resolved_at = now()
       WHERE run_id = $1 AND status IN ('pending','stale')`,
      [oldRun],
    );
    await c.query(`UPDATE runs SET status = 'cancelled' WHERE id = $1 AND status IN ('running','submitted')`, [oldRun]);
  }
  await c.query(`UPDATE agents SET status = 'idle', context_packet = NULL WHERE id = $1`, [agentId]);
  await startAgent(c, agentId);
  await c.query(`UPDATE agents SET memory_reset = true WHERE id = $1`, [agentId]);
  await logApproval(c, { actor: who, action: "restart", targetType: "agent", targetId: agentId, versionCheck: "n/a" });
  await logEvent(
    c,
    who,
    "restart",
    PERSON_NAME[who] + " restarted " + a.name + " with a fresh run. Its old working memory was cleared.",
    "agent " + agentId + (oldRun ? " previous run " + oldRun : ""),
  );
  return { ok: true, message: a.name + " is starting a new run." };
}

// Redo with latest: a stale proposal is discarded and its agent starts a new run that reads
// the current decision versions. Nothing from the old run is copied forward.
export async function redoWithLatest(c: PoolClient, who: Person, proposalId: string): Promise<Result> {
  const p = await one<any>(c, `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`, [proposalId]);
  if (!p) return { ok: false, status: 404, message: "That proposal does not exist." };
  if (p.status !== "pending" && p.status !== "stale") {
    return { ok: false, status: 409, message: "This proposal is already " + p.status + "." };
  }
  await c.query(
    `UPDATE proposals SET status='redo_requested', resolved_at=now(), stale_reason=COALESCE(stale_reason, 'Replaced by a fresh run.')
     WHERE run_id=$1 AND status IN ('pending','stale')`,
    [p.run_id],
  );
  await c.query(`UPDATE runs SET status='cancelled' WHERE id=$1 AND status <> 'cancelled'`, [p.run_id]);
  await c.query(`UPDATE agents SET status='idle', step_label='Waiting to restart', updated_at=now() WHERE id=$1`, [p.agent_id]);
  await startAgent(c, p.agent_id);
  await logApproval(c, { actor: who, action: "redo_latest", targetType: "proposal", targetId: proposalId, versionCheck: "n/a" });
  await logEvent(c, who, "redo", PERSON_NAME[who] + " asked " + (p.agent_id === "copy" ? "Copy" : "Pricing") + " Agent to redo its work with the latest decisions.", "proposal " + proposalId);
  return { ok: true, message: "" };
}

// Publish: refused while anything is stale, pending, or unresolved. Snapshots only settled text.
export async function publishPage(c: PoolClient, who: Person): Promise<Result & { token?: string }> {
  const secs = await rows<any>(c, `SELECT * FROM sections ORDER BY sort_order`);
  const deps = await rows<any>(c, `SELECT * FROM section_dependencies`);
  const props = await rows<any>(c, `SELECT * FROM proposals`);
  const cards = await rows<any>(c, `SELECT * FROM decision_cards`);
  const changes = await rows<any>(c, `SELECT * FROM change_requests`);
  const blockers = getBlockers({
    sections: secs.map((s) => ({ id: s.id, title: s.title, status: s.status })),
    proposals: props.map((p) => ({ status: p.status, sectionId: p.section_id })),
    cards: cards.map((k) => ({ id: k.id, status: k.status, decisionId: k.decision_id })),
    changes: changes.filter((x) => x.status === "open").map((x) => ({ id: x.id, decisionId: x.decision_id })),
  });
  if (blockers.length > 0) {
    return { ok: false, status: 409, message: "Not ready to publish: " + blockers.length + " item(s) still need a decision." };
  }
  const decisions = await rows<any>(c, `SELECT id, title, current_version, current_value FROM decisions ORDER BY id`);
  const changes_made = await rows<any>(
    c,
    `SELECT v.decision_id, v.version, v.value, v.requested_by, v.confirmed_by, v.reason, d.title
     FROM decision_versions v JOIN decisions d ON d.id = v.decision_id
     WHERE v.version > 1 ORDER BY v.created_at`,
  );
  const events = await rows<any>(c, `SELECT seq, plain, created_at FROM events WHERE kind <> 'agent_step' ORDER BY seq DESC LIMIT 30`);
  const lastReset = events.findIndex((e) => e.plain.includes("reset the demo"));
  const approved = props.filter((p) => p.status === "approved");
  const approvers = await rows<any>(c, `SELECT actor, target_id FROM approvals WHERE action = 'approve'`);
  const snapshot = {
    publishedBy: who,
    sections: secs.map((s) => {
      const p = approved.filter((x) => x.section_id === s.id).sort((a, b) => +new Date(b.resolved_at) - +new Date(a.resolved_at))[0];
      const by = p ? approvers.find((a) => a.target_id === String(p.id))?.actor : null;
      return {
        id: s.id,
        title: s.title,
        text: s.approved_text,
        dependsOn: deps.filter((d) => d.section_id === s.id).map((d) => d.decision_id),
        source: p ? p.mode : "starting",
        approvedBy: by ? PERSON_NAME[by as Person] : null,
      };
    }),
    decisions: decisions.map((d) => ({ id: d.id, title: d.title, version: d.current_version, value: d.current_value })),
    changes: changes_made.map((v) => ({
      title: v.title,
      value: v.value,
      reason: v.reason,
      requestedBy: PERSON_NAME[v.requested_by as Person] ?? null,
      confirmedBy: PERSON_NAME[v.confirmed_by as Person] ?? null,
    })),
    timeline: (lastReset === -1 ? events : events.slice(0, lastReset)).reverse().map((e) => ({ plain: e.plain, at: e.created_at })),
  };
  const token = randomUUID().replace(/-/g, "").slice(0, 16);
  await c.query(`INSERT INTO published_pages (id, token, snapshot) VALUES ($1,$2,$3)`, [randomUUID(), token, JSON.stringify(snapshot)]);
  await logApproval(c, { actor: who, action: "publish", targetType: "page", targetId: token, versionCheck: "passed" });
  await logEvent(c, who, "published", PERSON_NAME[who] + " published the launch page.", "published token " + token);
  return { ok: true, message: "Published.", token };
}
