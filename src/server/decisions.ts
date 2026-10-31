import type { PoolClient } from "@neondatabase/serverless";
import { markStale } from "./stale";
import { randomUUID } from "node:crypto";
import { one, rows } from "./tx";
import { logEvent, logApproval, type Actor } from "./events";
import { canConfirm } from "./publish-rules";
import { PERSON_NAME, type Person } from "@/db/seed";

export type Impact = { affected: string[]; notAffected: string[] };

// Impact preview: which sections depend on the decision, and which do not.
export async function impactFor(c: PoolClient, decisionId: string): Promise<Impact> {
  const secs = await rows<{ id: string; title: string }>(c, `SELECT id, title FROM sections ORDER BY sort_order`);
  const deps = await rows<{ section_id: string }>(
    c,
    `SELECT section_id FROM section_dependencies WHERE decision_id = $1`,
    [decisionId],
  );
  const set = new Set(deps.map((d) => d.section_id));
  return {
    affected: secs.filter((s) => set.has(s.id)).map((s) => s.title),
    notAffected: secs.filter((s) => !set.has(s.id)).map((s) => s.title),
  };
}

// Request a decision change. Creates an open change request. Does NOT change the decision.
export async function requestChange(
  c: PoolClient,
  who: Person,
  decisionId: string,
  requestedValue: string,
  reason: string,
): Promise<{ ok: true; id: string } | { ok: false; status: number; message: string }> {
  const d = await one<any>(c, `SELECT * FROM decisions WHERE id = $1 FOR UPDATE`, [decisionId]);
  if (!d) return { ok: false, status: 404, message: "That decision does not exist." };
  if (d.current_value === requestedValue) return { ok: false, status: 400, message: "That is already the current value." };
  const open = await one<any>(
    c,
    `SELECT id FROM change_requests WHERE decision_id = $1 AND status = 'open'`,
    [decisionId],
  );
  if (open) return { ok: false, status: 409, message: "There is already an open change request for this decision." };
  const id = randomUUID();
  await c.query(
    `INSERT INTO change_requests (id, decision_id, requested_value, base_version, requested_by, reason, status)
     VALUES ($1,$2,$3,$4,$5,$6,'open')`,
    [id, decisionId, requestedValue, d.current_version, who, reason],
  );
  await logApproval(c, {
    actor: who,
    action: "request_change",
    targetType: "decision",
    targetId: decisionId,
    note: reason,
    versionCheck: "n/a",
    detail: `Requested "${requestedValue}" against version ${d.current_version}.`,
  });
  await logEvent(
    c,
    who,
    "change_requested",
    `${PERSON_NAME[who]} asked to change ${decisionId} ${d.title} to "${requestedValue}".`,
    `change_request ${id} base_version=${d.current_version}`,
  );
  return { ok: true, id };
}

// Reject a change request. Only the other person may reject it. The decision does not change.
export async function rejectChange(
  c: PoolClient,
  who: Person,
  changeId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const ch = await one<any>(c, `SELECT * FROM change_requests WHERE id = $1 FOR UPDATE`, [changeId]);
  if (!ch) return { ok: false, status: 404, message: "That change request does not exist." };
  if (ch.status !== "open") return { ok: false, status: 409, message: "That change was already resolved." };
  if (!canConfirm(who, ch.requested_by)) {
    return { ok: false, status: 403, message: "You asked for this change, so the other person decides on it." };
  }
  await c.query(`UPDATE change_requests SET status='rejected', confirmed_by=$2, resolved_at=now() WHERE id=$1`, [changeId, who]);
  await logApproval(c, {
    actor: who,
    action: "reject_change",
    targetType: "change",
    targetId: changeId,
    note: ch.reason,
    versionCheck: "n/a",
    detail: `Rejected the request to set ${ch.decision_id} to "${ch.requested_value}".`,
  });
  await logEvent(
    c,
    who,
    "change_rejected",
    `${PERSON_NAME[who]} rejected the request to change ${ch.decision_id} to "${ch.requested_value}". It stays as it was.`,
    `change_request ${changeId}`,
  );
  return { ok: true };
}

// Confirm a change. Second-person rule enforced here, on the server.
// Compare base version with current version: refuse if the decision moved on.
export async function confirmChange(
  c: PoolClient,
  who: Person,
  changeId: string,
  baseVersionSeen: number,
): Promise<{ ok: true; version: number } | { ok: false; status: number; message: string }> {
  const ch = await one<any>(c, `SELECT * FROM change_requests WHERE id = $1 FOR UPDATE`, [changeId]);
  if (!ch) return { ok: false, status: 404, message: "That change request does not exist." };
  if (ch.status !== "open") return { ok: false, status: 409, message: "That change was already resolved." };
  if (!canConfirm(who, ch.requested_by)) {
    await logApproval(c, {
      actor: who,
      action: "confirm_change",
      targetType: "change",
      targetId: changeId,
      versionCheck: "n/a",
      detail: "Refused: the person who requested a change cannot confirm it.",
    });
    return { ok: false, status: 403, message: "You asked for this change, so another person must confirm it." };
  }
  const d = await one<any>(c, `SELECT * FROM decisions WHERE id = $1 FOR UPDATE`, [ch.decision_id]);
  const versionOk = d.current_version === ch.base_version && ch.base_version === baseVersionSeen;
  if (!versionOk) {
    await logApproval(c, {
      actor: who,
      action: "confirm_change",
      targetType: "change",
      targetId: changeId,
      versionCheck: "failed",
      detail: `Decision is now version ${d.current_version}; request was made against ${ch.base_version}.`,
    });
    return { ok: false, status: 409, message: "The decision changed since this request. Refresh and review again." };
  }
  const next = d.current_version + 1;
  await c.query(
    `INSERT INTO decision_versions (id, decision_id, version, value, requested_by, confirmed_by, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(), ch.decision_id, next, ch.requested_value, ch.requested_by, who, ch.reason],
  );
  await c.query(`UPDATE decisions SET current_version = $2, current_value = $3 WHERE id = $1`, [
    ch.decision_id,
    next,
    ch.requested_value,
  ]);
  await c.query(`UPDATE change_requests SET status='confirmed', confirmed_by=$2, result_version=$3, resolved_at=now() WHERE id=$1`, [
    changeId,
    who,
    next,
  ]);
  await logApproval(c, {
    actor: who,
    action: "confirm_change",
    targetType: "change",
    targetId: changeId,
    note: ch.reason,
    versionCheck: "passed",
    detail: `Created ${ch.decision_id} version ${next}.`,
  });
  await markStale(c, ch.decision_id, next);
  await logEvent(
    c,
    who,
    "decision_changed",
    `${PERSON_NAME[who]} confirmed ${ch.decision_id} is now "${ch.requested_value}" (version ${next}).`,
    `decision ${ch.decision_id} v${next}`,
  );
  return { ok: true, version: next };
}
