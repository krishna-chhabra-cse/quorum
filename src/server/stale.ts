import type { PoolClient } from "@neondatabase/serverless";

// Marks only the work that depends on the changed decision. Nothing else is touched.
// A section is stale only when it lists the decision in section_dependencies.
// A proposal is stale only when its own section depends on the decision and it read an older version.
export async function markStale(c: PoolClient, decisionId: string, newVersion: number): Promise<void> {
  await c.query(
    `UPDATE sections SET status = 'stale', stale_reason = $2
     WHERE id IN (SELECT section_id FROM section_dependencies WHERE decision_id = $1)
       AND status <> 'stale'`,
    [decisionId, decisionId + " changed to version " + newVersion + ". This text was written against the old decision."],
  );
  await c.query(
    `UPDATE proposals SET status = 'stale', stale_reason = $2
     WHERE status = 'pending'
       AND section_id IN (SELECT section_id FROM section_dependencies WHERE decision_id = $1)
       AND (versions_used ->> $1::text) IS NOT NULL
       AND ((versions_used ->> $1::text)::int) < $3::int`,
    [decisionId, "Written against " + decisionId + " before it changed to version " + newVersion + ".", newVersion],
  );
}
