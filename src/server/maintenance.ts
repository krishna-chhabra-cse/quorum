import type { PoolClient } from "@neondatabase/serverless";
import { one, rows } from "./tx";
import { logEvent } from "./events";
import { insertSeed } from "@/db/setup";
import { PERSON_NAME, type Person } from "@/db/seed";

// Reset demo: wipe the working data and put the seed back. The event history is kept
// as an audit trail, and a reset event is appended. The event counter is preserved so
// new event sequence numbers never collide with the kept history.
export async function resetDemo(c: PoolClient, who: Person): Promise<{ ok: true; message: string }> {
  const counter = await one<{ value: string }>(c, `SELECT value FROM meta WHERE key = 'event_seq'`);
  for (const t of [
    "decision_versions",
    "change_requests",
    "decision_cards",
    "proposals",
    "runs",
    "approvals",
    "published_pages",
    "section_dependencies",
    "sections",
    "decisions",
    "agents",
  ]) {
    await c.query("DELETE FROM " + t);
  }
  await insertSeed(c);
  if (counter) await c.query(`UPDATE meta SET value = $1 WHERE key = 'event_seq'`, [counter.value]);
  await logEvent(c, who, "reset", PERSON_NAME[who] + " reset the demo to its starting state.", "demo reset");
  return { ok: true, message: "The demo is back to its starting state." };
}

// Presence: a heartbeat per person. Online means seen in the last 6 seconds.
export async function heartbeat(c: PoolClient, who: Person): Promise<void> {
  await c.query(
    `INSERT INTO presence (person, last_seen) VALUES ($1, now())
     ON CONFLICT (person) DO UPDATE SET last_seen = now()`,
    [who],
  );
}

// Export: the full audit trail as JSON. Events plus approval checks, with decisions and sections.
export async function exportJson(c: PoolClient) {
  const decisions = await rows<any>(c, `SELECT * FROM decisions ORDER BY id`);
  const versions = await rows<any>(c, `SELECT * FROM decision_versions ORDER BY decision_id, version`);
  const secs = await rows<any>(c, `SELECT * FROM sections ORDER BY sort_order`);
  const events = await rows<any>(c, `SELECT * FROM events ORDER BY seq`);
  const approvals = await rows<any>(c, `SELECT * FROM approvals ORDER BY created_at, id`);
  return {
    exportedAt: new Date().toISOString(),
    decisions: decisions.map((d) => ({ id: d.id, title: d.title, currentVersion: d.current_version, currentValue: d.current_value })),
    decisionVersions: versions.map((v) => ({ decisionId: v.decision_id, version: v.version, value: v.value, requestedBy: v.requested_by, confirmedBy: v.confirmed_by, reason: v.reason })),
    sections: secs.map((s) => ({ id: s.id, title: s.title, status: s.status, text: s.approved_text, staleReason: s.stale_reason })),
    events: events.map((e) => ({ seq: e.seq, actor: e.actor, kind: e.kind, plain: e.plain, technical: e.technical, at: e.created_at })),
    approvals: approvals.map((a) => ({ actor: a.actor, action: a.action, target: a.target_id, versionCheck: a.version_check, note: a.note, detail: a.detail, at: a.created_at })),
  };
}
