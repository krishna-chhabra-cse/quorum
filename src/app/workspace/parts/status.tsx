const TONES = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  agent: "bg-agent-soft text-agent",
  plain: "bg-muted text-muted-foreground",
};

const LABELS: Record<string, { text: string; tone: keyof typeof TONES }> = {
  current: { text: "Up to date", tone: "good" },
  agent_working: { text: "Agent writing", tone: "agent" },
  awaiting_approval: { text: "Needs review", tone: "warn" },
  stale: { text: "Out of date", tone: "bad" },
  pending: { text: "Waiting", tone: "plain" },
  approved: { text: "Approved", tone: "good" },
  rejected: { text: "Rejected", tone: "plain" },
  redo_requested: { text: "Sent back", tone: "plain" },
  superseded: { text: "Replaced by restart", tone: "plain" },
  done: { text: "Finished", tone: "plain" },
  idle: { text: "Ready", tone: "plain" },
  waiting: { text: "Waiting for a person", tone: "warn" },
  working: { text: "Writing", tone: "agent" },
  open: { text: "Needs an answer", tone: "warn" },
  answered: { text: "Needs a second person", tone: "info" },
  confirmed: { text: "Settled", tone: "good" },
};

// One badge style for every status, always with words, so color is never the only signal.
export function StatusBadge({ status }: { status: string }) {
  const l = LABELS[status] ?? { text: status, tone: "plain" as const };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[l.tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full bg-current ${status === "working" || status === "agent_working" ? "pulse-dot" : ""}`} />
      {l.text}
    </span>
  );
}
