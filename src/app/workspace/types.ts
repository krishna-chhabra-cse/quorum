// Mirrors the object returned by loadView in src/server/state.ts.
export type Person = "maya" | "arjun";

export type Section = {
  id: string;
  title: string;
  agentId: string | null;
  text: string;
  status: "current" | "agent_working" | "awaiting_approval" | "stale";
  staleReason: string | null;
  dependsOn: string[];
};

export type Mismatch = { decision: string; used: number; current: number };

export type Proposal = {
  id: string;
  runId: string;
  agentId: string;
  sectionId: string;
  currentText: string;
  proposedText: string;
  reason: string;
  versionsUsed: Record<string, number>;
  mismatches: Mismatch[];
  mode: string;
  status: string;
  staleReason: string | null;
  humanNote: string | null;
  submittedAt: string;
};

export type Option = { id: string; label: string; pro: string; con: string };

export type Card = {
  id: string;
  agentId: string;
  decisionId: string;
  question: string;
  options: Option[];
  status: string;
  answerOption: string | null;
  answerNote: string | null;
  answeredBy: string | null;
  confirmedBy: string | null;
};

export type Change = {
  id: string;
  decisionId: string;
  requestedValue: string;
  requestedBy: string;
  reason: string;
  status: string;
  confirmedBy: string | null;
  resultVersion: number | null;
  baseVersion: number;
};

// What an agent carries into a run. Rebuilt from the database on every run start or restart.
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

export type Decision = {
  id: string;
  title: string;
  question: string;
  owner: string;
  ownerName: string;
  version: number;
  value: string;
  history: { version: number; value: string; requestedBy: string | null; confirmedBy: string | null; reason: string | null; createdAt: string }[];
  affectedSections: string[];
};

export type Agent = {
  id: string;
  name: string;
  sectionIds: string[];
  status: string;
  stepLabel: string;
  clockSec: number;
  submitAfterSec: number;
  runId: string | null;
  memoryReset: boolean;
  contextPacket: unknown;
};

export type Blocker = { kind: string; text: string; href: string };

export type View = {
  me: Person;
  aiLive: boolean;
  people: { id: Person; name: string; online: boolean; you: boolean }[];
  decisions: Decision[];
  sections: Section[];
  agents: Agent[];
  proposals: Proposal[];
  cards: Card[];
  changes: Change[];
  events: { seq: number; actor: string; plain: string; technical: string | null; createdAt: string }[];
  approvals: { actor: string; action: string; targetId: string; note: string | null; versionCheck: string; detail: string | null; createdAt: string }[];
  blockers: Blocker[];
  pages: { token: string; createdAt: string }[];
};

export type Act = (name: string, body?: unknown, success?: string) => Promise<{ ok: boolean; message?: string; token?: string }>;
