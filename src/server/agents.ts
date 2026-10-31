import type { PoolClient } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { one, rows } from "./tx";
import { logEvent } from "./events";
import { draftSection } from "./ai";
import { pickVariant } from "./variant";
import { raiseCard, shouldRaiseCard } from "./cards";
import { buildContextPacket } from "./context";
import { settleRun } from "./settle";
import { pickDeps, sectionDeps } from "./deps";
import type { SectionKind } from "./scripted";

const STEPS = [
  "Reading current decisions",
  "Reading approved sections",
  "Checking rejected ideas and notes",
  "Drafting text",
  "Checking draft against decisions",
];

// Each agent has a fixed plan. The clock only runs while it is working (not waiting on a human).
export async function startAgent(c: PoolClient, agentId: "copy" | "pricing") {
  const a = await one<any>(c, `SELECT * FROM agents WHERE id = $1 FOR UPDATE`, [agentId]);
  if (!a) return;
  if (["working", "waiting"].includes(a.status)) return;
  const decisions = await rows<any>(c, `SELECT id, current_version FROM decisions ORDER BY id`);
  const readVersions: Record<string, number> = {};
  for (const d of decisions) readVersions[d.id] = d.current_version;
  const attempt = (await one<any>(c, `SELECT COALESCE(MAX(attempt),0)+1 AS n FROM runs WHERE agent_id = $1`, [agentId])).n;
  const runId = randomUUID();
  await c.query(
    `INSERT INTO runs (id, agent_id, attempt, read_versions, status) VALUES ($1,$2,$3,$4,'running')`,
    [runId, agentId, attempt, JSON.stringify(readVersions)],
  );
  const readAt = new Date().toISOString();
  const packet = await buildContextPacket(c, agentId, attempt, readVersions, readAt);
  await c.query(
    `UPDATE agents SET status='working', step=0, step_label=$2, run_id=$3, clock_ms=0, last_tick_at=now(), updated_at=now(), memory_reset=false, context_packet=$4 WHERE id=$1`,
    [agentId, STEPS[0], runId, JSON.stringify(packet)],
  );
  await logEvent(c, agentId, "agent_started", a.name + " started a new run.", "run " + runId + " attempt " + attempt + " read " + JSON.stringify(readVersions));
}

// Advance one agent by one tick. The row lock plus the clock check prevent duplicate steps.
export async function tickAgent(c: PoolClient, agentId: "copy" | "pricing") {
  const a = await one<any>(c, `SELECT * FROM agents WHERE id = $1 FOR UPDATE`, [agentId]);
  if (!a || a.status !== "working") return;
  const now = await one<{ now: Date }>(c, `SELECT now() AS now`);
  const last = a.last_tick_at ? new Date(a.last_tick_at).getTime() : now!.now.getTime();
  const elapsed = Math.max(0, now!.now.getTime() - last);
  const clockMs = a.clock_ms + Math.min(elapsed, 4000);
  const clockSec = Math.floor(clockMs / 1000);
  const stepIndex = Math.min(STEPS.length - 1, Math.floor((clockSec / a.submit_after_sec) * STEPS.length));
  if (stepIndex !== a.step) {
    await logEvent(c, agentId, "agent_step", a.name + ": " + STEPS[stepIndex] + ".");
  }
  await c.query(
    `UPDATE agents SET clock_ms=$2, last_tick_at=now(), step=$3, step_label=$4, updated_at=now() WHERE id=$1`,
    [agentId, clockMs, stepIndex, STEPS[stepIndex]],
  );
  if (clockSec >= a.submit_after_sec) {
    await submitRun(c, agentId, a.run_id);
  }
}

// Value of each decision at the version the run read, from decision_versions history.
async function loadValuesAtVersions(c: PoolClient, versions: Record<string, number>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [id, v] of Object.entries(versions)) {
    const row = await one<{ value: string }>(c, `SELECT value FROM decision_versions WHERE decision_id = $1 AND version = $2`, [id, v]);
    if (row) out[id] = row.value;
  }
  return out;
}

// Build proposals for every section the agent owns, using ONLY the versions the run read.
export async function submitRun(c: PoolClient, agentId: "copy" | "pricing", runId: string) {
  const run = await one<any>(c, `SELECT * FROM runs WHERE id = $1 FOR UPDATE`, [runId]);
  if (!run || run.status !== "running") return;
  const readVersions = run.read_versions as Record<string, number>;
  const agent = await one<any>(c, `SELECT * FROM agents WHERE id = $1`, [agentId]);
  const readValues = await loadValuesAtVersions(c, readVersions);

  // Pricing holds its proposal until a human settles the pricing question.
  if (agentId === "pricing" && shouldRaiseCard(readVersions)) {
    await raiseCard(c, "pricing", runId);
    await c.query(`UPDATE runs SET status='submitted' WHERE id=$1`, [runId]);
    await c.query(`UPDATE agents SET status='waiting', step_label='Waiting for a pricing decision', updated_at=now() WHERE id=$1`, [agentId]);
    await logEvent(c, agentId, "proposal_submitted", agent.name + " is waiting on a pricing decision and has not drafted text yet.", "run " + runId);
    return;
  }

  const sectionIds = (agent.section_ids as string).split(",");
  const variant = pickVariant(readValues);
  const tone = readValues.D3 ?? "";
  const readLabel = Object.entries(readVersions).map(([k, v]) => k + " v" + v).join(", ");
  for (const sid of sectionIds) {
    const sec = await one<any>(c, `SELECT * FROM sections WHERE id = $1`, [sid]);
    // Footer is only proposed when it is Stale, so a normal run leaves a Current footer alone.
    if (sid === "footer" && sec.status !== "stale") continue;
    const deps = await sectionDeps(c, sid);
    const sectionUsed = pickDeps(readVersions, deps);
    const sectionLabel = Object.entries(sectionUsed).map(([k, v]) => k + " v" + v).join(", ");
    const draft = await draftSection(sid as SectionKind, variant, tone);
    await c.query(
      `INSERT INTO proposals (id, run_id, agent_id, section_id, current_text, proposed_text, reason, versions_used, mode, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       ON CONFLICT (run_id, section_id) DO NOTHING`,
      [randomUUID(), runId, agentId, sid, sec.approved_text, draft.text, "Written from " + sectionLabel + ".", JSON.stringify(sectionUsed), draft.mode],
    );
    if (draft.fallbackReason) {
      await logEvent(c, "system", "ai_fallback", "Used scripted text for " + sid + ": " + draft.fallbackReason + ".");
    }
  }
  await c.query(`UPDATE runs SET status='submitted' WHERE id=$1`, [runId]);
  await c.query(`UPDATE agents SET status='waiting', step_label='Waiting for human review', updated_at=now() WHERE id=$1`, [agentId]);
  await logEvent(c, agentId, "proposal_submitted", agent.name + " submitted its proposals for review.", "run " + runId);
  await settleRun(c, runId);
}
