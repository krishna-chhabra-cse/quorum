import { pgTable, text, integer, timestamp, boolean, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true }).defaultNow().notNull();

export const decisions = pgTable("decisions", {
  id: text("id").primaryKey(), // D1, D2, D3
  title: text("title").notNull(),
  question: text("question").notNull(),
  owner: text("owner").notNull(), // maya | arjun
  currentVersion: integer("current_version").notNull(),
  currentValue: text("current_value").notNull(),
});

export const decisionVersions = pgTable(
  "decision_versions",
  {
    id: text("id").primaryKey(),
    decisionId: text("decision_id").notNull(),
    version: integer("version").notNull(),
    value: text("value").notNull(),
    requestedBy: text("requested_by"),
    confirmedBy: text("confirmed_by"),
    reason: text("reason"),
    createdAt: ts("created_at"),
  },
  (t) => [uniqueIndex("dv_decision_version_uq").on(t.decisionId, t.version)],
);

export const sections = pgTable("sections", {
  id: text("id").primaryKey(), // hero, features, pricing, footer
  title: text("title").notNull(),
  agentId: text("agent_id"), // copy | pricing | null
  order: integer("sort_order").notNull(),
  approvedText: text("approved_text").notNull(),
  approvedProposalId: text("approved_proposal_id"),
  status: text("status").notNull(), // current | agent_working | awaiting_approval | stale
  staleReason: text("stale_reason"),
});

// stored dependencies: section -> decision
export const sectionDependencies = pgTable(
  "section_dependencies",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id").notNull(),
    decisionId: text("decision_id").notNull(),
  },
  (t) => [uniqueIndex("sd_uq").on(t.sectionId, t.decisionId)],
);

export const agents = pgTable("agents", {
  id: text("id").primaryKey(), // copy | pricing
  name: text("name").notNull(),
  sectionIds: text("section_ids").notNull(), // comma list
  status: text("status").notNull(), // idle | working | waiting | blocked | done
  step: integer("step").notNull().default(0),
  stepLabel: text("step_label").notNull().default("Not started"),
  runId: text("run_id"),
  submitAfterSec: integer("submit_after_sec").notNull(),
  contextPacket: jsonb("context_packet"),
  memoryReset: boolean("memory_reset").notNull().default(false),
  clockMs: integer("clock_ms").notNull().default(0), // active working time, frozen while waiting on a human
  lastTickAt: timestamp("last_tick_at", { withTimezone: true }),
  updatedAt: ts("updated_at"),
});

export const runs = pgTable(
  "runs",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    attempt: integer("attempt").notNull(),
    startedAt: ts("started_at"),
    // versions this run read at start: { D1: 1, D2: 1, D3: 1 }
    readVersions: jsonb("read_versions").notNull(),
    status: text("status").notNull(), // running | submitted | cancelled
  },
  (t) => [uniqueIndex("runs_agent_attempt_uq").on(t.agentId, t.attempt)],
);

export const proposals = pgTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    agentId: text("agent_id").notNull(),
    sectionId: text("section_id").notNull(),
    currentText: text("current_text").notNull(),
    proposedText: text("proposed_text").notNull(),
    reason: text("reason").notNull(),
    versionsUsed: jsonb("versions_used").notNull(),
    mode: text("mode").notNull(), // live | scripted
    status: text("status").notNull(), // pending | approved | rejected | stale | redo_requested
    submittedAt: ts("submitted_at"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    staleReason: text("stale_reason"),
    humanNote: text("human_note"),
  },
  (t) => [
    uniqueIndex("proposals_run_section_uq").on(t.runId, t.sectionId),
    index("proposals_status_idx").on(t.status),
  ],
);

export const decisionCards = pgTable(
  "decision_cards",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    runId: text("run_id").notNull(),
    decisionId: text("decision_id").notNull(),
    question: text("question").notNull(),
    optionsJson: jsonb("options_json").notNull(),
    status: text("status").notNull(), // open | answered | confirmed | reopened
    answerOption: text("answer_option"),
    answerNote: text("answer_note"),
    answeredBy: text("answered_by"),
    confirmedBy: text("confirmed_by"),
    createdAt: ts("created_at"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("cards_run_decision_uq").on(t.runId, t.decisionId)],
);

// Human-initiated decision change requests
export const changeRequests = pgTable("change_requests", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull(),
  requestedValue: text("requested_value").notNull(),
  baseVersion: integer("base_version").notNull(),
  requestedBy: text("requested_by").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(), // open | confirmed | rejected
  confirmedBy: text("confirmed_by"),
  resultVersion: integer("result_version"),
  createdAt: ts("created_at"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(), // approve | reject | redirect | redo | confirm_change | answer_card | confirm_card | reject_card
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  note: text("note"),
  versionCheck: text("version_check").notNull(), // passed | failed | n/a
  detail: text("detail"),
  createdAt: ts("created_at"),
});

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    seq: integer("seq").notNull(),
    actor: text("actor").notNull(), // maya | arjun | copy | pricing | system
    kind: text("kind").notNull(),
    plain: text("plain").notNull(),
    technical: text("technical"),
    createdAt: ts("created_at"),
  },
  (t) => [uniqueIndex("events_seq_uq").on(t.seq)],
);

export const presence = pgTable("presence", {
  person: text("person").primaryKey(), // maya | arjun
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull(),
});

export const publishedPages = pgTable("published_pages", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: ts("created_at"),
}, (t) => [uniqueIndex("published_token_uq").on(t.token)]);

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
