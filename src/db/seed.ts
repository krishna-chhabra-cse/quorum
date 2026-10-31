// Demo seed data for the Slate launch page. Used on first setup and on Reset demo.

export const PEOPLE = ["maya", "arjun"] as const;
export type Person = (typeof PEOPLE)[number];
export const PERSON_NAME: Record<Person, string> = { maya: "Maya", arjun: "Arjun" };

export const SEED_DECISIONS = [
  {
    id: "D1",
    title: "Target customer",
    question: "Who is Slate for?",
    owner: "maya",
    value: "College students",
  },
  {
    id: "D2",
    title: "Pricing model",
    question: "How do people pay for Slate?",
    owner: "maya",
    value: "$5 per month, individual plan",
  },
  {
    id: "D3",
    title: "Brand tone",
    question: "How should the page sound?",
    owner: "arjun",
    value: "Friendly and clear",
  },
];

export const SEED_SECTIONS = [
  {
    id: "hero",
    title: "Hero",
    agentId: "copy",
    order: 1,
    text: "Never lose a detail from a meeting again. Slate turns your lectures and study groups into clear notes you can actually use.",
  },
  {
    id: "features",
    title: "Features",
    agentId: "copy",
    order: 2,
    text: "Live transcripts for every lecture. Action items pulled out for you. Notes you can share with your study group in one tap.",
  },
  {
    id: "pricing",
    title: "Pricing",
    agentId: "pricing",
    order: 3,
    text: "$5 per month for one individual plan with everything in Slate. Cancel anytime.",
  },
  {
    id: "footer",
    title: "Footer call to action",
    agentId: "copy",
    order: 4,
    text: "Start taking better notes today. Try Slate free for 14 days.",
  },
];

export const SEED_DEPENDENCIES = [
  { sectionId: "hero", decisionId: "D1" },
  { sectionId: "hero", decisionId: "D3" },
  { sectionId: "features", decisionId: "D1" },
  { sectionId: "pricing", decisionId: "D1" },
  { sectionId: "pricing", decisionId: "D2" },
  { sectionId: "footer", decisionId: "D3" },
];

export const SEED_AGENTS = [
  { id: "copy", name: "Copy Agent", sectionIds: "hero,features,footer", submitAfterSec: 10 },
  { id: "pricing", name: "Pricing Agent", sectionIds: "pricing", submitAfterSec: 60 },
];

// Event sequence counter lives in meta('event_seq'); the seed event uses seq 1.
export const EVENT_SEQ_START = 1;

export const SEED_EVENTS = [
  {
    id: "seed-1",
    seq: 1,
    actor: "system",
    kind: "setup",
    plain: "Quorum opened with the Slate launch page demo.",
    technical: "Seed data inserted: 3 decisions at version 1, 4 sections, 2 agents.",
  },
];
