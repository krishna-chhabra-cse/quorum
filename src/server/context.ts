import type { PoolClient } from "@neondatabase/serverless";
import { one, rows } from "./tx";

export type ContextPacket = {
  attempt: number;
  readAt: string;
  readVersions: Record<string, number>;
  decisions: { id: string; title: string; version: number; value: string }[];
  approvedSections: { id: string; title: string; text: string }[];
  rejectedIdeas: { section: string; idea: string; outcome: string }[];
  humanNotes: { from: string; note: string }[];
  openTask: string;
};

const OUTCOME: Record<string, string> = {
  rejected: "Rejected by a person",
  redo_requested: "Sent back with a note",
  superseded: "Replaced by a restart",
};

// Rebuilds the packet from the database. Everything the agent may use is listed here,
// so a fresh run never depends on memory from an earlier run.
export async function buildContextPacket(
  c: PoolClient,
  agentId: string,
  attempt: number,
  readVersions: Record<string, number>,
  readAt: string,
): Promise<ContextPacket> {
  const agent = await one<any>(c, `SELECT * FROM agents WHERE id = $1`, [agentId]);
  const sectionIds = (agent.section_ids as string).split(",");
  const decisions = await rows<any>(c, `SELECT id, title, current_version, current_value FROM decisions ORDER BY id`);
  const secs = await rows<any>(
    c,
    `SELECT id, title, approved_text FROM sections WHERE id = ANY($1) ORDER BY sort_order`,
    [sectionIds],
  );
  const props = await rows<any>(
    c,
    `SELECT section_id, proposed_text, status FROM proposals
     WHERE agent_id = $1 AND status IN ('rejected','redo_requested','superseded')
     ORDER BY submitted_at DESC LIMIT 8`,
    [agentId],
  );
  const notes = await rows<any>(
    c,
    `SELECT actor, note FROM approvals
     WHERE note IS NOT NULL AND note <> ''
       AND (target_id IN (SELECT id FROM proposals WHERE agent_id = $1)
         OR target_id IN (SELECT id FROM decision_cards WHERE agent_id = $1))
     ORDER BY created_at DESC LIMIT 10`,
    [agentId],
  );
  const titles = secs.map((s) => s.title as string);
  return {
    attempt,
    readAt,
    readVersions,
    decisions: decisions.map((d) => ({ id: d.id, title: d.title, version: d.current_version, value: d.current_value })),
    approvedSections: secs.map((s) => ({ id: s.id, title: s.title, text: s.approved_text })),
    rejectedIdeas: props.map((p) => ({
      section: p.section_id,
      idea: p.proposed_text,
      outcome: OUTCOME[p.status] ?? p.status,
    })),
    humanNotes: notes.map((n) => ({ from: n.actor, note: n.note })),
    openTask: `Write ${titles.join(" and ")} from the decision versions in this packet. Do not repeat rejected ideas.`,
  };
}
