"use client";

import { ChevronDown, Hourglass, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Act, Change, Decision, View } from "../types";
import { Avatar } from "./avatar";

const FIELD = "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const SUGGESTIONS: Record<string, string> = { D1: "Enterprise IT teams" };

// The team's plan. Anyone can ask for a change, and a second person must agree to it.
export function DecisionsPanel({ view, act }: { view: View; act: Act }) {
  return (
    <section aria-labelledby="decisions-heading" className="space-y-3">
      <div>
        <h2 id="decisions-heading" className="text-lg font-bold">
          The plan
        </h2>
        <p className="text-sm text-muted-foreground">Decisions the page is built on. Agents read these before they write.</p>
      </div>
      <ul className="space-y-3">
        {view.decisions.map((d) => (
          <DecisionRow key={d.id} d={d} pending={view.changes.find((c) => c.decisionId === d.id && c.status === "open")} act={act} />
        ))}
      </ul>
    </section>
  );
}

function DecisionRow({ d, pending, act }: { d: Decision; pending?: Change; act: Act }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const suggestion = SUGGESTIONS[d.id];

  async function request(e: React.FormEvent) {
    e.preventDefault();
    const res = await act("requestChange", { decisionId: d.id, requestedValue: value, reason }, "Sent to the other person to confirm.");
    if (res.ok) {
      setOpen(false);
      setValue("");
      setReason("");
    }
  }

  return (
    <li id={`ledger-${d.id}`} className="scroll-mt-24 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold text-muted-foreground">{d.question}</p>
      <p className="mt-1 text-base leading-snug font-bold">{d.value}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Avatar actor={d.owner} size="sm" /> {d.ownerName} owns this · Version {d.version}
      </p>

      {pending ? (
        <a href="#attention" className="mt-3 flex items-start gap-2 rounded-lg bg-info-soft p-3 text-sm text-info">
          <Hourglass size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>Change to &ldquo;{pending.requestedValue}&rdquo; needs a second person.</span>
        </a>
      ) : (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Cancel" : "Change this"}
          </Button>
          {open ? (
            <form onSubmit={request} className="mt-3 space-y-3">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">New decision</span>
                <input required value={value} maxLength={200} onChange={(e) => setValue(e.target.value)} className={FIELD} placeholder={d.value} />
              </label>
              {suggestion && !value ? (
                <button type="button" onClick={() => setValue(suggestion)} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold hover:bg-border">
                  Try: {suggestion}
                </button>
              ) : null}
              <div className="rounded-lg bg-warn-soft p-3 text-sm text-warn" aria-live="polite">
                <p className="font-semibold">Impact preview</p>
                <p className="mt-0.5">
                  If confirmed, this will mark {d.affectedSections.join(", ") || "no sections"} out of date. Sections that do not rely on it stay as they are.
                </p>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Why are you changing it?</span>
                <input required value={reason} maxLength={400} onChange={(e) => setReason(e.target.value)} className={FIELD} placeholder="One sentence for your teammate" />
              </label>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users size={14} aria-hidden="true" /> A second person must confirm this.
              </p>
              <Button type="submit" size="sm">
                Send for confirmation
              </Button>
            </form>
          ) : null}
        </div>
      )}

      <details className="group mt-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-muted-foreground">
          History ({d.history.length}) <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" />
        </summary>
        <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {d.history.map((h) => (
            <li key={h.version}>
              <span className="font-semibold text-foreground">Version {h.version}:</span> {h.value}
              {h.reason ? ` · ${h.reason}` : ""}
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}
