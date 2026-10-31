import type { PoolClient } from "@neondatabase/serverless";
import { one } from "./tx";
import { logEvent } from "./events";

// A run is finished once every proposal it made has been approved, rejected, or superseded.
// The agent then goes idle so it can start a new run. Runs waiting on a decision card have
// no proposals yet and are left alone.
export async function settleRun(c: PoolClient, runId: string): Promise<void> {
  const run = await one<any>(c, `SELECT * FROM runs WHERE id = $1 FOR UPDATE`, [runId]);
  if (!run || run.status !== "submitted") return;
  const open = await one<{ id: string }>(
    c,
    `SELECT id FROM proposals WHERE run_id = $1 AND status IN ('pending','stale') LIMIT 1`,
    [runId],
  );
  if (open) return;
  const made = await one<{ n: number }>(c, `SELECT COUNT(*)::int AS n FROM proposals WHERE run_id = $1`, [runId]);
  if (!made || made.n === 0) return;
  const agentId = run.agent_id as "copy" | "pricing";
  await c.query(`UPDATE runs SET status = 'done' WHERE id = $1`, [runId]);
  await c.query(
    `UPDATE agents SET status = 'idle', step_label = 'Run finished. Start a new run when you need one.', updated_at = now()
     WHERE id = $1 AND run_id = $2 AND status = 'waiting'`,
    [agentId, runId],
  );
  const name = agentId === "copy" ? "Copy Agent" : "Pricing Agent";
  await logEvent(c, agentId, "run_finished", name + " finished its run. Every proposal is settled.", "run " + runId);
}
