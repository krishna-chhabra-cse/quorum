import type { View } from "./types";

export type StepState = "done" | "now" | "todo";
export type Step = { title: string; hint: string; state: StepState };

export type Cta = { kind: "start" } | { kind: "publish" } | { kind: "attention" } | { kind: "page"; token: string };

export type Story = {
  tone: "action" | "waiting" | "working" | "good";
  title: string;
  detail: string;
  cta: Cta | null;
  steps: Step[];
};

// Turns the workspace state into one plain sentence and a progress trail.
// Everything here is derived from real state, so the guide can never fake progress.
export function buildStory(view: View): Story {
  const other = view.people.find((p) => !p.you)?.name ?? "the other person";
  const titleOf = (id: string) => view.decisions.find((d) => d.id === id)?.title.toLowerCase() ?? "a decision";

  const change = view.changes.find((c) => c.status === "open");
  const card = view.cards.find((c) => c.status !== "confirmed");
  const outdated = view.proposals.filter((p) => (p.status === "pending" || p.status === "stale") && (p.status === "stale" || p.mismatches.length > 0));
  const toReview = view.proposals.filter((p) => p.status === "pending" && p.mismatches.length === 0);
  const staleSections = view.sections.filter((s) => s.status === "stale");
  const working = view.agents.filter((a) => a.status === "working");
  const started = view.agents.some((a) => a.runId !== null);
  const changed = view.decisions.some((d) => d.version > 1);
  const lastMark = view.events.find((e) => /published the launch page|reset the demo/.test(e.plain));
  const published = Boolean(lastMark?.plain.includes("published"));
  const retried = view.agents.some((a) => ((a.contextPacket as { attempt?: number } | null)?.attempt ?? 0) >= 2);
  const everOutdated = outdated.length > 0 || staleSections.length > 0 || view.proposals.some((p) => ["stale", "redo_requested", "superseded"].includes(p.status));

  const passed = [
    started || view.people.every((p) => p.online),
    view.proposals.length > 0,
    changed,
    changed && everOutdated,
    retried,
    view.cards.some((c) => c.status === "confirmed"),
    published,
  ];
  const firstOpen = passed.findIndex((p) => !p);
  const state = (i: number): StepState => (passed[i] ? "done" : i === firstOpen ? "now" : "todo");
  const steps: Step[] = [
    { title: "Team joins", hint: "Two people open this page", state: state(0) },
    { title: "Agents draft", hint: "Two AI agents write in parallel", state: state(1) },
    { title: "Plan changes", hint: "A person changes a decision", state: state(2) },
    { title: "Old work caught", hint: "Outdated text is flagged", state: state(3) },
    { title: "Agents catch up", hint: "They reread the latest plan", state: state(4) },
    { title: "People decide", hint: "An agent asks for a decision", state: state(5) },
    { title: "Publish", hint: "The approved page goes live", state: state(6) },
  ];

  const base = { steps };
  if (change) {
    const name = change.requestedBy === "maya" ? "Maya" : "Arjun";
    return change.requestedBy === view.me
      ? { ...base, tone: "waiting", title: `Waiting for ${other} to confirm your change`, detail: `You asked to change the ${titleOf(change.decisionId)} to "${change.requestedValue}". Nothing changes until a second person agrees.`, cta: null }
      : { ...base, tone: "action", title: `${name} wants to change the ${titleOf(change.decisionId)}`, detail: `Your turn: confirm or reject "${change.requestedValue}". A second person must agree before the plan changes.`, cta: { kind: "attention" } };
  }
  if (card) {
    if (card.status === "answered") {
      return card.answeredBy === view.me
        ? { ...base, tone: "waiting", title: `Waiting for ${other} to confirm your answer`, detail: "Pricing Agent will carry on once a second person agrees.", cta: null }
        : { ...base, tone: "action", title: "Please confirm the pricing answer", detail: "A teammate answered Pricing Agent's question. Your confirmation updates the plan.", cta: { kind: "attention" } };
    }
    return { ...base, tone: "action", title: "Pricing Agent needs a human decision", detail: "It has stopped and will not guess. Pick an option, then a second person confirms it.", cta: { kind: "attention" } };
  }
  if (outdated.length > 0) {
    return { ...base, tone: "action", title: "The plan changed, so some agent work is out of date", detail: `Quorum caught ${outdated.length} item${outdated.length === 1 ? "" : "s"} written from the old plan. Ask the agent to redo the work.`, cta: { kind: "attention" } };
  }
  if (working.length > 0) {
    const names = working.map((a) => a.name).join(" and ");
    return { ...base, tone: "working", title: `${names} ${working.length === 1 ? "is" : "are"} writing`, detail: toReview.length > 0 ? "You can review finished text now, or change a decision while they work." : "You can watch progress here, or change a decision while they work.", cta: toReview.length > 0 ? { kind: "attention" } : null };
  }
  if (toReview.length > 0) {
    return { ...base, tone: "action", title: `${toReview.length} new draft${toReview.length === 1 ? " is" : "s are"} ready for review`, detail: "Compare the new text with the page. Nothing goes live unless a person approves it.", cta: { kind: "attention" } };
  }
  if (staleSections.length > 0) {
    return { ...base, tone: "action", title: "Part of the page is out of date", detail: `Restart the agent that writes ${staleSections.map((s) => s.title).join(", ")} so it can use the latest plan.`, cta: { kind: "attention" } };
  }
  if (!started) {
    return { ...base, tone: "action", title: "Ready when you are", detail: "Start the agents to draft the Slate launch page. For the full demo, open this page as the other person in a second window.", cta: { kind: "start" } };
  }
  if (published && view.pages[0]) {
    return { ...base, tone: "good", title: "The page is published", detail: "Every section matches the latest decisions and a person approved the changes.", cta: { kind: "page", token: view.pages[0].token } };
  }
  return { ...base, tone: "good", title: "Everything is up to date", detail: "Nothing is waiting on a person, so the page is ready to publish.", cta: { kind: "publish" } };
}
