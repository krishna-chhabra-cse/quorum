import type { PoolClient } from "@neondatabase/serverless";
import { rows } from "./tx";

// Decision ids a section depends on, read from section_dependencies. This is the only
// source of truth for "does this decision matter to this section".
export async function sectionDeps(c: PoolClient, sectionId: string): Promise<string[]> {
  const r = await rows<{ decision_id: string }>(
    c,
    `SELECT decision_id FROM section_dependencies WHERE section_id = $1 ORDER BY decision_id`,
    [sectionId],
  );
  return r.map((x) => x.decision_id);
}

// Pure: keep only the entries of a version map that belong to the given decisions.
export function pickDeps(used: Record<string, number>, deps: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of deps) {
    if (used[d] !== undefined) out[d] = used[d];
  }
  return out;
}
