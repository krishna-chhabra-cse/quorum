const LABELS: Record<string, { text: string; cls: string }> = {
  current: { text: "Current", cls: "border-border text-foreground" },
  agent_working: { text: "Agent working", cls: "border-border text-muted-foreground" },
  awaiting_approval: { text: "Needs a decision", cls: "border-foreground bg-foreground text-background" },
  stale: { text: "Stale", cls: "border-foreground text-foreground font-semibold" },
  pending: { text: "Waiting", cls: "border-border text-muted-foreground" },
  approved: { text: "Approved", cls: "border-border text-foreground" },
  rejected: { text: "Rejected", cls: "border-border text-muted-foreground" },
  redo_requested: { text: "Sent back", cls: "border-border text-muted-foreground" },
  superseded: { text: "Replaced by restart", cls: "border-border text-muted-foreground" },
  done: { text: "Run finished", cls: "border-border text-muted-foreground" },
  idle: { text: "Idle", cls: "border-border text-muted-foreground" },
  waiting: { text: "Waiting for a human", cls: "border-foreground text-foreground" },
  working: { text: "Working", cls: "border-border text-muted-foreground" },
  open: { text: "Open", cls: "border-border text-foreground" },
  answered: { text: "Waiting for confirmation", cls: "border-foreground text-foreground" },
  confirmed: { text: "Settled", cls: "border-border text-muted-foreground" },
  confirmed_change: { text: "Confirmed", cls: "border-border text-muted-foreground" },
};

// One badge style for every status word, so a human can scan the page quickly.
export function StatusBadge({ status }: { status: string }) {
  const l = LABELS[status] ?? { text: status, cls: "border-border" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${l.cls}`}>
      {l.text}
    </span>
  );
}
