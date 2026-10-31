"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Act, Card, Proposal, View } from "../types";
import { StatusBadge } from "./status";

// Things waiting on a human: proposals to approve or send back, and decision cards to settle.
export function QueuePanel({ view, act }: { view: View; act: Act }) {
  const open = view.proposals.filter((p) => p.status === "pending" || p.status === "stale");
  const cards = view.cards.filter((c) => c.status !== "confirmed");
  const empty = open.length === 0 && cards.length === 0;
  return (
    <section aria-labelledby="queue-heading" className="space-y-4">
      <div>
        <h2 id="queue-heading" className="text-lg font-semibold">
          Waiting for a human
        </h2>
        <p className="text-sm text-muted-foreground">Approve a proposal only if it still matches the decisions it was written from.</p>
      </div>
      {empty ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nothing is waiting. Start an agent run to get new proposals.
        </p>
      ) : null}
      <ul className="space-y-3">
        {open.map((p) => (
          <ProposalCard key={p.id} p={p} view={view} act={act} />
        ))}
        {cards.map((c) => (
          <CardRow key={c.id} c={c} me={view.me} act={act} />
        ))}
      </ul>
    </section>
  );
}

function ProposalCard({ p, view, act }: { p: Proposal; view: View; act: Act }) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"none" | "redirect" | "reject">("none");
  const sectionTitle = view.sections.find((s) => s.id === p.sectionId)?.title ?? p.sectionId;
  const agent = view.agents.find((a) => a.id === p.agentId)?.name ?? p.agentId;
  const sectionDeps = view.sections.find((s) => s.id === p.sectionId)?.dependsOn ?? [];
  const stale = p.status === "stale" || p.mismatches.length > 0;
  const pending = p.status === "pending";

  return (
    <li id={`queue-${p.sectionId}`} className="scroll-mt-6 rounded-lg border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          {sectionTitle} <span className="font-normal text-muted-foreground">from {agent}</span>
        </h3>
        <StatusBadge status={stale ? "stale" : p.status === "pending" ? "awaiting_approval" : p.status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Written from: {describeVersions(sectionVersions(p.versionsUsed, sectionDeps), view)}</p>

      {stale ? (
        <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
          {p.staleReason ?? "This text was written against an older decision."} Approving is blocked. Send it back so {agent}{" "}
          can write it from the current decisions.
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Live now</p>
          <p className="mt-1 text-sm">{p.currentText}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Proposed</p>
          <p className="mt-1 text-sm">{p.proposedText}</p>
        </div>
      </div>

      {p.humanNote ? <p className="mt-3 text-xs text-muted-foreground">Note sent: {p.humanNote}</p> : null}

      {pending || p.status === "stale" ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act("approve", { proposalId: p.id }, "Approved. The section is updated.")} disabled={stale}>
              Approve
            </Button>
            {stale ? (
              <Button size="sm" onClick={() => act("redoLatest", { proposalId: p.id }, "Agent is writing from the latest decisions.")}>
                Redo with latest
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setMode(mode === "redirect" ? "none" : "redirect")}>
              Redirect with note
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode(mode === "reject" ? "none" : "reject")}>
              Reject and keep the old text
            </Button>
          </div>
          {mode !== "none" ? (
            <div className="grid gap-2 sm:max-w-xl">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">{mode === "redirect" ? "What should the agent change?" : "Why reject? (optional)"}</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3"
                />
              </label>
              <div>
                <Button
                  size="sm"
                  onClick={() =>
                    mode === "redirect"
                      ? act("redirect", { proposalId: p.id, note }, "Sent back to the agent with your note.")
                      : act("reject", { proposalId: p.id, note }, "Rejected. The old text stays on the page.")
                  }
                  disabled={mode === "redirect" && note.trim().length === 0}
                >
                  {mode === "redirect" ? "Send back" : "Reject"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

// Only the decisions this section depends on are shown in "Written from".
function sectionVersions(used: Record<string, number>, deps: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of deps) if (used[d] !== undefined) out[d] = used[d];
  return out;
}

function describeVersions(used: Record<string, number>, view: View): string {
  const titles = Object.fromEntries(view.decisions.map((d) => [d.id, d.title]));
  return Object.entries(used)
    .map(([id, v]) => `${titles[id] ?? id} (v${v})`)
    .join(", ");
}

function CardRow({ c, me, act }: { c: Card; me: string; act: Act }) {
  const [pick, setPick] = useState<string>(c.answerOption ?? "");
  const [note, setNote] = useState<string>(c.answerNote ?? "");
  const answered = c.status === "answered";
  const isAnswerer = c.answeredBy === me;
  return (
    <li id={`card-${c.id}`} className="scroll-mt-6 rounded-lg border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Decision question from the Pricing Agent</h3>
        <StatusBadge status={c.status} />
      </div>
      <p className="mt-2 text-sm">{c.question}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {c.options.map((o) => (
          <label key={o.id} className="flex cursor-pointer gap-2 rounded-md border border-border p-3 text-sm has-[:checked]:bg-muted">
            <input
              type="radio"
              name={`card-${c.id}`}
              value={o.id}
              checked={pick === o.id}
              disabled={answered}
              onChange={() => setPick(o.id)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{o.label}</span>
              <span className="block text-muted-foreground">Good: {o.pro}</span>
              <span className="block text-muted-foreground">Trade-off: {o.con}</span>
            </span>
          </label>
        ))}
      </div>
      {!answered ? (
        <label className="mt-3 grid gap-1 text-sm sm:max-w-xl">
          <span className="font-medium">Note for the other person (optional)</span>
          <input
            value={note}
            maxLength={400}
            onChange={(e) => setNote(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3"
            placeholder="Why this option?"
          />
        </label>
      ) : c.answerNote ? (
        <p className="mt-3 text-sm text-muted-foreground">Note: {c.answerNote}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!answered ? (
          <Button size="sm" disabled={!pick} onClick={() => act("answerCard", { cardId: c.id, optionId: pick, note }, "Answer saved. The other person can confirm it.")}>
            Save answer
          </Button>
        ) : isAnswerer ? (
          <p className="text-sm text-muted-foreground">You answered. The other person needs to confirm.</p>
        ) : (
          <>
            <Button size="sm" onClick={() => act("confirmCard", { cardId: c.id }, "Confirmed.")}>
              Confirm answer
            </Button>
            <Button variant="outline" size="sm" onClick={() => act("rejectCard", { cardId: c.id }, "Sent back open.")}>
              Send back open
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
