import type { PoolClient } from "@neondatabase/serverless";
import { one, rows } from "./tx";
import { logEvent, logApproval } from "./events";
import { settleRun } from "./settle";
import { pickDeps, sectionDeps } from "./deps";
import { PERSON_NAME, type Person } from "@/db/seed";

type Result = { ok: true; message: string } | { ok: false; status: number; message: string };

// Approve: compare the proposal's versions with current versions on the server.
// Refuse if any differ, even when the UI is out of date.
export async function approveProposal(c: PoolClient, who: Person, proposalId: string): Promise<Result> {
  const p = await one<any>(c, `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`, [proposalId]);
  if (!p) return { ok: false, status: 404, message: "That proposal does not exist." };
  if (p.status !== "pending") {
    return { ok: false, status: 409, message: "This proposal is already " + p.status + "." };
  }
  // Only the decisions this section depends on can make its text stale.
  const deps = await sectionDeps(c, p.section_id);
  const current = await currentVersions(c, deps);
  const used = pickDeps(p.versions_used as Record<string, number>, deps);
  const mismatch = Object.entries(used).find(([id, v]) => current[id] !== v);
  if (mismatch) {
    const [id, v] = mismatch;
    await c.query(`UPDATE proposals SET status='stale', stale_reason=$2, resolved_at=now() WHERE id=$1`, [
      proposalId,
      "Written against " + id + " version " + v + "; current is version " + current[id] + ".",
    ]);
    await logApproval(c, {
      actor: who,
      action: "approve",
      targetType: "proposal",
      targetId: proposalId,
      versionCheck: "failed",
      detail: "Used " + id + " v" + v + ", current v" + current[id] + ". Refused.",
    });
    return {
      ok: false,
      status: 409,
      message: "This text was written against " + id + " version " + v + ", but " + id + " is now version " + current[id] + ". It is marked Stale.",
    };
  }
  await c.query(`UPDATE proposals SET status='approved', resolved_at=now() WHERE id=$1`, [proposalId]);
  await c.query(
    `UPDATE sections SET approved_text=$2, approved_proposal_id=$3, status='current', stale_reason=NULL WHERE id=$1`,
    [p.section_id, p.proposed_text, proposalId],
  );
  await logApproval(c, {
    actor: who,
    action: "approve",
    targetType: "proposal",
    targetId: proposalId,
    versionCheck: "passed",
    detail: "Versions matched: " + Object.entries(used).map(([k, v]) => k + " v" + v).join(", ") + ".",
  });
  await logEvent(c, who, "approved", PERSON_NAME[who] + " approved the new " + p.section_id + " text.", "proposal " + proposalId);
  await settleRun(c, p.run_id);
  return { ok: true, message: "Approved. The section is updated." };
}

// Reject: keep the old text, record the rejected idea so the agent does not repeat it.
export async function rejectProposal(c: PoolClient, who: Person, proposalId: string, note: string | null): Promise<Result> {
  const p = await one<any>(c, `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`, [proposalId]);
  if (!p) return { ok: false, status: 404, message: "That proposal does not exist." };
  if (p.status !== "pending" && p.status !== "stale") {
    return { ok: false, status: 409, message: "This proposal is already " + p.status + "." };
  }
  await c.query(`UPDATE proposals SET status='rejected', human_note=$2, resolved_at=now() WHERE id=$1`, [proposalId, note]);
  await logApproval(c, { actor: who, action: "reject", targetType: "proposal", targetId: proposalId, note, versionCheck: "n/a" });
  await logEvent(c, who, "rejected", PERSON_NAME[who] + " rejected the proposal for " + p.section_id + ".", "proposal " + proposalId);
  await settleRun(c, p.run_id);
  return { ok: true, message: "Rejected. The old text stays on the page." };
}

// Redirect: send the agent back with a note. The run is cancelled, its other pending
// proposals are cleared, and the agent is idle so it can be restarted.
export async function redirectProposal(c: PoolClient, who: Person, proposalId: string, note: string): Promise<Result> {
  const p = await one<any>(c, `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`, [proposalId]);
  if (!p) return { ok: false, status: 404, message: "That proposal does not exist." };
  if (p.status !== "pending" && p.status !== "stale") {
    return { ok: false, status: 409, message: "This proposal is already " + p.status + "." };
  }
  await c.query(`UPDATE proposals SET status='redo_requested', human_note=$2, resolved_at=now() WHERE id=$1`, [proposalId, note]);
  await c.query(
    `UPDATE proposals SET status='redo_requested', human_note=$2, resolved_at=now()
     WHERE run_id=$1 AND status IN ('pending','stale') AND id <> $3`,
    [p.run_id, note, proposalId],
  );
  await c.query(`UPDATE runs SET status='cancelled' WHERE id=$1 AND status <> 'cancelled'`, [p.run_id]);
  await c.query(`UPDATE agents SET status='idle', step_label='Waiting to restart', updated_at=now() WHERE id=$1`, [p.agent_id]);
  await logApproval(c, { actor: who, action: "redirect", targetType: "proposal", targetId: proposalId, note, versionCheck: "n/a" });
  await logEvent(c, who, "redirected", PERSON_NAME[who] + " sent " + (p.agent_id === "copy" ? "Copy" : "Pricing") + " Agent back with a note.", "proposal " + proposalId);
  return { ok: true, message: "Sent back to the agent with your note." };
}

export async function currentVersions(c: PoolClient, ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (ids.length === 0) return out;
  const r = await rows<{ id: string; current_version: number }>(c, `SELECT id, current_version FROM decisions WHERE id = ANY($1)`, [ids]);
  for (const x of r) out[x.id] = x.current_version;
  return out;
}
