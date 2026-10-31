"use client";

import { ArrowRight, Check, Lock, MessageCircleQuestion, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Act, Card, Change, Proposal, View } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status";

const FIELD = "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const nameOf = (id: string | null) => (id === "maya" ? "Maya" : id === "arjun" ? "Arjun" : "A teammate");

// Everything that needs a person, in one list: changes, questions, and drafts.
export function QueuePanel({ view, act }: { view: View; act: Act }) {
  const changes = view.changes.filter((c) => c.status === "open");
  const cards = view.cards.filter((c) => c.status !== "confirmed");
  const proposals = view.proposals.filter((p) => p.status === "pending" || p.status === "stale");
  const outdated = (p: Proposal) => (p.status === "stale" || p.mismatches.length > 0 ? 0 : 1);
  const sorted = [...proposals].sort((a, b) => outdated(a) - outdated(b));
  const count = changes.length + cards.length + proposals.length;
  return (
    <section id="attention" aria-labelledby="queue-heading" className="scroll-mt-24 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="queue-heading" className="text-lg font-bold">
          Needs a person
        </h2>
        {count > 0 ? <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{count}</span> : null}
      </div>
      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Nothing is waiting. Agents never publish on their own, so anything they write will appear here first.
        </p>
      ) : null}
      <ul className="space-y-3">
        {changes.map((c) => (
          <ChangeRow key={c.id} c={c} view={view} act={act} />
        ))}
        {cards.map((c) => (
          <CardRow key={c.id} c={c} me={view.me} act={act} />
        ))}
        {sorted.map((p) => (
          <ProposalRow key={p.id} p={p} view={view} act={act} />
        ))}
      </ul>
    </section>
  );
}

function ChangeRow({ c, view, act }: { c: Change; view: View; act: Act }) {
  const d = view.decisions.find((x) => x.id === c.decisionId);
  const mine = c.requestedBy === view.me;
  return (
    <li className="rounded-2xl border border-info/30 bg-surface p-4 shadow-card">
      <div className="flex items-start gap-2.5">
        <Avatar actor={c.requestedBy} size="sm" />
        <div className="min-w-0">
          <h3 className="text-sm font-bold">{nameOf(c.requestedBy)} wants to change the plan</h3>
          <p className="text-xs text-muted-foreground">{d?.question}</p>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-muted px-2 py-1 line-through decoration-muted-foreground/60">{d?.value}</span>
        <ArrowRight size={15} aria-hidden="true" className="text-muted-foreground" />
        <span className="rounded-md bg-good-soft px-2 py-1 font-semibold text-good">{c.requestedValue}</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Reason: {c.reason}</p>
      <p className="mt-1 text-sm text-muted-foreground">This affects {d?.affectedSections.join(", ") || "no sections"}.</p>
      {mine ? (
        <p className="mt-3 rounded-lg bg-info-soft p-3 text-sm text-info">You asked for this, so someone else needs to confirm it.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act("confirmChange", { changeId: c.id, baseVersion: c.baseVersion }, "Confirmed. The plan is updated.")}>
            Confirm change
          </Button>
          <Button variant="outline" size="sm" onClick={() => act("rejectChange", { changeId: c.id }, "Rejected. The plan stays as it was.")}>
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

function ProposalRow({ p, view, act }: { p: Proposal; view: View; act: Act }) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"none" | "redirect" | "reject">("none");
  const section = view.sections.find((s) => s.id === p.sectionId)?.title ?? p.sectionId;
  const agent = view.agents.find((a) => a.id === p.agentId)?.name ?? p.agentId;
  const stale = p.status === "stale" || p.mismatches.length > 0;

  return (
    <li id={`queue-${p.sectionId}`} className={`scroll-mt-24 rounded-2xl border bg-surface p-4 shadow-card ${stale ? "border-bad/30" : "border-border"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Avatar actor={p.agentId} size="sm" /> {section} from {agent}
        </h3>
        <StatusBadge status={stale ? "stale" : "awaiting_approval"} />
      </div>

      {stale ? <StaleReason p={p} view={view} /> : null}

      <div className="mt-3 grid gap-2">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-semibold text-muted-foreground">On the page now</p>
          <p className="mt-1 text-sm">{p.currentText}</p>
        </div>
        <div className={`rounded-lg p-3 ${stale ? "bg-muted" : "bg-good-soft"}`}>
          <p className={`text-xs font-semibold ${stale ? "text-muted-foreground" : "text-good"}`}>{agent} suggests</p>
          <p className="mt-1 text-sm">{p.proposedText}</p>
        </div>
      </div>

      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold">Which plan did it read?</summary>
        <p className="mt-1">{describeVersions(p, view)} · {p.mode === "live" ? "Live AI" : "Scripted text"}</p>
      </details>

      {p.humanNote ? <p className="mt-2 text-xs text-muted-foreground">Note sent: {p.humanNote}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {stale ? (
          <>
            <Button size="sm" onClick={() => act("redoLatest", { proposalId: p.id }, `${agent} is rewriting this from the latest plan.`)}>
              <RefreshCw size={14} aria-hidden="true" /> Redo with latest
            </Button>
            <Button size="sm" variant="outline" disabled aria-label="Approve is locked because this draft is out of date">
              <Lock size={14} aria-hidden="true" /> Approve locked
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => act("approve", { proposalId: p.id }, "Approved. The page is updated.")}>
            <Check size={15} aria-hidden="true" /> Approve
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setMode(mode === "redirect" ? "none" : "redirect")} aria-expanded={mode === "redirect"}>
          Redirect with note
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMode(mode === "reject" ? "none" : "reject")} aria-expanded={mode === "reject"}>
          Reject
        </Button>
      </div>

      {mode !== "none" ? (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{mode === "redirect" ? "What should the agent change?" : "Why reject? (optional)"}</span>
            <input value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} className={FIELD} />
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
              {mode === "redirect" ? "Send back to agent" : "Reject and keep the old text"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

// Explains what went wrong in terms of the actual decisions, not version numbers.
function StaleReason({ p, view }: { p: Proposal; view: View }) {
  const m = p.mismatches[0];
  const d = m ? view.decisions.find((x) => x.id === m.decision) : null;
  const old = d?.history.find((h) => h.version === m?.used)?.value;
  return (
    <p className="mt-3 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-sm text-bad">
      <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>
        {d && old ? (
          <>
            Written for &ldquo;{old}&rdquo;, but the team now says &ldquo;{d.value}&rdquo;. It cannot be approved.
          </>
        ) : (
          "Written from an older plan, so it cannot be approved."
        )}
      </span>
    </p>
  );
}

function describeVersions(p: Proposal, view: View): string {
  return Object.entries(p.versionsUsed)
    .map(([id, v]) => {
      const d = view.decisions.find((x) => x.id === id);
      const value = d?.history.find((h) => h.version === v)?.value;
      return `${d?.title ?? id}: ${value ?? "unknown"} (version ${v})`;
    })
    .join(" · ");
}

function CardRow({ c, me, act }: { c: Card; me: string; act: Act }) {
  const [pick, setPick] = useState<string>(c.answerOption ?? "");
  const [note, setNote] = useState<string>("");
  const answered = c.status === "answered";
  const isAnswerer = c.answeredBy === me;
  return (
    <li id={`card-${c.id}`} className="scroll-mt-24 rounded-2xl border border-warn/40 bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <MessageCircleQuestion size={18} aria-hidden="true" className="text-warn" /> Pricing Agent asks
        </h3>
        <StatusBadge status={c.status} />
      </div>
      <p className="mt-2 text-base leading-snug font-semibold">{c.question}</p>
      <div className="mt-3 grid gap-2">
        {c.options.map((o) => (
          <label key={o.id} className={`flex gap-2.5 rounded-xl border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-info-soft ${answered ? "" : "cursor-pointer"} border-border`}>
            <input type="radio" name={`card-${c.id}`} value={o.id} checked={pick === o.id} disabled={answered} onChange={() => setPick(o.id)} className="mt-1" />
            <span>
              <span className="font-semibold">{o.label}</span>
              <span className="mt-1 block text-good">Good: {o.pro}</span>
              <span className="mt-0.5 block text-muted-foreground">Trade-off: {o.con}</span>
            </span>
          </label>
        ))}
      </div>
      {!answered ? (
        <label className="mt-3 grid gap-1 text-sm">
          <span className="font-semibold">Note for your teammate (optional)</span>
          <input value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} className={FIELD} placeholder="Why this option?" />
        </label>
      ) : c.answerNote ? (
        <p className="mt-3 text-sm text-muted-foreground">Note: {c.answerNote}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!answered ? (
          <Button size="sm" disabled={!pick} onClick={() => act("answerCard", { cardId: c.id, optionId: pick, note }, "Answer saved. Your teammate can confirm it.")}>
            Save answer
          </Button>
        ) : isAnswerer ? (
          <p className="w-full rounded-lg bg-info-soft p-3 text-sm text-info">You answered, so someone else needs to confirm it.</p>
        ) : (
          <>
            <p className="w-full text-sm text-muted-foreground">{nameOf(c.answeredBy)} picked this answer.</p>
            <Button size="sm" onClick={() => act("confirmCard", { cardId: c.id }, "Confirmed. Pricing Agent is writing from the new decision.")}>
              Confirm answer
            </Button>
            <Button variant="outline" size="sm" onClick={() => act("rejectCard", { cardId: c.id }, "Sent back so it can be answered again.")}>
              Send back open
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
