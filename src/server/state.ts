import type { PoolClient } from "@neondatabase/serverless";
import { rows } from "./tx";
import { PERSON_NAME, type Person } from "@/db/seed";
import { aiConfigured } from "./ai";
import { getBlockers, type Blocker } from "./publish-rules";
import { pickDeps } from "./deps";

export type SectionStatus = "current" | "agent_working" | "awaiting_approval" | "stale";

export type View = Awaited<ReturnType<typeof loadView>>;

// Reads the full workspace in one consistent pass for the UI. Read-only.
export async function loadView(c: PoolClient, me: Person) {
  const decisions = await rows<any>(c, `SELECT * FROM decisions ORDER BY id`);
  const versionRows = await rows<any>(c, `SELECT * FROM decision_versions ORDER BY decision_id, version`);
  const sectionRows = await rows<any>(c, `SELECT * FROM sections ORDER BY sort_order`);
  const depRows = await rows<any>(c, `SELECT * FROM section_dependencies`);
  const agentRows = await rows<any>(c, `SELECT * FROM agents ORDER BY id`);
  const proposalRows = await rows<any>(c, `SELECT * FROM proposals ORDER BY submitted_at DESC, id`);
  const cardRows = await rows<any>(c, `SELECT * FROM decision_cards ORDER BY created_at DESC, id`);
  const changeRows = await rows<any>(c, `SELECT * FROM change_requests ORDER BY created_at DESC, id`);
  const eventRows = await rows<any>(c, `SELECT * FROM events ORDER BY seq DESC LIMIT 80`);
  const approvalRows = await rows<any>(c, `SELECT * FROM approvals ORDER BY created_at DESC LIMIT 40`);
  const presenceRows = await rows<any>(
    c,
    `SELECT person, (last_seen > now() - interval '6 seconds') AS online FROM presence`,
  );
  const pageRows = await rows<any>(c, `SELECT id, token, created_at FROM published_pages ORDER BY created_at DESC`);

  const current: Record<string, number> = {};
  for (const d of decisions) current[d.id] = d.current_version;

  const sections = sectionRows.map((s) => {
    const dependsOn = depRows.filter((d) => d.section_id === s.id).map((d) => d.decision_id as string);
    const owner = agentRows.find((a) => a.id === s.agent_id);
    const pending = proposalRows.find((p) => p.section_id === s.id && p.status === "pending");
    const openCard = cardRows.some((k) => k.agent_id === s.agent_id && k.status !== "confirmed");
    let status: SectionStatus = "current";
    // Stale is stored on the section and always wins. Pending proposals need a human.
    // The footer only gets a run when it is stale, so an agent's status never applies to it here.
    // Sections with settled text stay Current while their agent waits on a different section.
    if (s.status === "stale") status = "stale";
    else if (pending) status = "awaiting_approval";
    else if (s.id !== "footer" && owner?.status === "working") status = "agent_working";
    else if (s.id !== "footer" && openCard) status = "awaiting_approval";
    return {
      id: s.id as string,
      title: s.title as string,
      agentId: s.agent_id as string | null,
      text: s.approved_text as string,
      status,
      staleReason: s.stale_reason as string | null,
      dependsOn,
    };
  });

  const proposals = proposalRows.map((p) => {
    const sectionDepIds = depRows.filter((d) => d.section_id === p.section_id).map((d) => d.decision_id as string);
    const used = pickDeps(p.versions_used as Record<string, number>, sectionDepIds);
    const mismatches = Object.entries(used)
      .filter(([id, v]) => current[id] !== v)
      .map(([id, v]) => ({ decision: id, used: v, current: current[id] }));
    return {
      id: p.id as string,
      runId: p.run_id as string,
      agentId: p.agent_id as string,
      sectionId: p.section_id as string,
      currentText: p.current_text as string,
      proposedText: p.proposed_text as string,
      reason: p.reason as string,
      versionsUsed: used,
      mismatches,
      mode: p.mode as string,
      status: p.status as string,
      staleReason: p.stale_reason as string | null,
      humanNote: p.human_note as string | null,
      submittedAt: p.submitted_at as string,
    };
  });

  // Blockers come from the raw rows, never from the display status, so an agent badge can't hide one.
  const blockers: Blocker[] = getBlockers({
    sections: sectionRows.map((s) => ({ id: s.id as string, title: s.title as string, status: s.status as string })),
    proposals: proposalRows.map((p) => ({ status: p.status as string, sectionId: p.section_id as string })),
    cards: cardRows.map((k) => ({ id: k.id, status: k.status, decisionId: k.decision_id })),
    changes: changeRows.filter((x) => x.status === "open").map((x) => ({ id: x.id, decisionId: x.decision_id })),
  });

  const people = (["maya", "arjun"] as const).map((id) => {
    const pr = presenceRows.find((r) => r.person === id);
    return { id, name: PERSON_NAME[id], online: Boolean(pr?.online), you: id === me };
  });

  const agents = agentRows.map((a) => {
    const runId = a.run_id as string | null;
    return {
      id: a.id as string,
      name: a.name as string,
      sectionIds: (a.section_ids as string).split(","),
      status: a.status as string,
      stepLabel: a.step_label as string,
      clockSec: Math.floor((a.clock_ms as number) / 1000),
      submitAfterSec: a.submit_after_sec as number,
      runId,
      memoryReset: a.memory_reset as boolean,
      contextPacket: a.context_packet as unknown,
    };
  });

  return {
    me,
    aiLive: aiConfigured(),
    people,
    decisions: decisions.map((d) => ({
      id: d.id as string,
      title: d.title as string,
      question: d.question as string,
      owner: d.owner as string,
      ownerName: PERSON_NAME[d.owner as Person] ?? d.owner,
      version: d.current_version as number,
      value: d.current_value as string,
      history: versionRows
        .filter((v) => v.decision_id === d.id)
        .map((v) => ({
          version: v.version as number,
          value: v.value as string,
          requestedBy: v.requested_by as string | null,
          confirmedBy: v.confirmed_by as string | null,
          reason: v.reason as string | null,
          createdAt: v.created_at as string,
        }))
        .reverse(),
      affectedSections: sections.filter((s) => s.dependsOn.includes(d.id)).map((s) => s.title),
    })),
    sections,
    agents,
    proposals,
    cards: cardRows.map((k) => ({
      id: k.id as string,
      agentId: k.agent_id as string,
      decisionId: k.decision_id as string,
      question: k.question as string,
      options: k.options_json as { id: string; label: string; pro: string; con: string }[],
      status: k.status as string,
      answerOption: k.answer_option as string | null,
      answerNote: k.answer_note as string | null,
      answeredBy: k.answered_by as string | null,
      confirmedBy: k.confirmed_by as string | null,
    })),
    changes: changeRows.map((x) => ({
      id: x.id as string,
      decisionId: x.decision_id as string,
      requestedValue: x.requested_value as string,
      requestedBy: x.requested_by as string,
      reason: x.reason as string,
      status: x.status as string,
      confirmedBy: x.confirmed_by as string | null,
      resultVersion: x.result_version as number | null,
      baseVersion: x.base_version as number,
    })),
    events: eventRows.map((e) => ({
      seq: e.seq as number,
      actor: e.actor as string,
      plain: e.plain as string,
      technical: e.technical as string | null,
      createdAt: e.created_at as string,
    })),
    approvals: approvalRows.map((a) => ({
      actor: a.actor as string,
      action: a.action as string,
      targetId: a.target_id as string,
      note: a.note as string | null,
      versionCheck: a.version_check as string,
      detail: a.detail as string | null,
      createdAt: a.created_at as string,
    })),
    blockers,
    pages: pageRows.map((p) => ({ token: p.token as string, createdAt: p.created_at as string })),
  };
}

export type ViewModel = View;
