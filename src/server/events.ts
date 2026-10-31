import type { PoolClient } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

export type Actor = "maya" | "arjun" | "copy" | "pricing" | "system";

// Allocates a gap-free sequence number by locking the meta row, then appends the event.
// Must run inside a transaction.
export async function logEvent(
  c: PoolClient,
  actor: Actor,
  kind: string,
  plain: string,
  technical?: string,
): Promise<void> {
  const r = await c.query(
    `UPDATE meta SET value = (value::int + 1)::text WHERE key = 'event_seq' RETURNING value::int AS seq`,
  );
  const seq = r.rows[0].seq as number;
  await c.query(
    `INSERT INTO events (id, seq, actor, kind, plain, technical) VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), seq, actor, kind, plain, technical ?? null],
  );
}

export async function logApproval(
  c: PoolClient,
  row: {
    actor: Actor;
    action: string;
    targetType: string;
    targetId: string;
    note?: string | null;
    versionCheck: "passed" | "failed" | "n/a";
    detail?: string;
  },
): Promise<void> {
  await c.query(
    `INSERT INTO approvals (id, actor, action, target_type, target_id, note, version_check, detail)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      randomUUID(),
      row.actor,
      row.action,
      row.targetType,
      row.targetId,
      row.note ?? null,
      row.versionCheck,
      row.detail ?? null,
    ],
  );
}
