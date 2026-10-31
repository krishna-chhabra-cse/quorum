// Pure rules. No database access, so they can be reasoned about and tested directly.

export type Blocker = { kind: "stale" | "pending" | "card" | "change"; text: string; href: string };

type Input = {
  sections: { id: string; title: string; status: string }[];
  proposals: { status: string; sectionId: string }[];
  cards: { id: string; status: string; decisionId: string }[];
  changes: { id: string; decisionId: string }[];
};

// Publishing is blocked while anything is stale, pending, or unresolved.
export function getBlockers(s: Input): Blocker[] {
  const out: Blocker[] = [];
  for (const sec of s.sections) {
    if (sec.status === "stale") {
      out.push({ kind: "stale", text: `${sec.title} is out of date because a decision changed.`, href: `#section-${sec.id}` });
    }
  }
  for (const p of s.proposals) {
    if (p.status === "pending" || p.status === "stale") {
      out.push({ kind: "pending", text: `A proposal for ${p.sectionId} is waiting for a human decision.`, href: `#queue-${p.sectionId}` });
    }
  }
  for (const c of s.cards) {
    if (c.status !== "confirmed") {
      out.push({ kind: "card", text: `A question about ${c.decisionId} is not settled yet.`, href: `#card-${c.id}` });
    }
  }
  for (const ch of s.changes) {
    out.push({ kind: "change", text: `A change request for ${ch.decisionId} is waiting for a second person to confirm.`, href: `#ledger-${ch.decisionId}` });
  }
  return out;
}

// Second-person rule: the requester (or answerer) can never confirm their own item.
export function canConfirm(actor: string, requestedBy: string | null): boolean {
  return !!requestedBy && actor !== requestedBy;
}
