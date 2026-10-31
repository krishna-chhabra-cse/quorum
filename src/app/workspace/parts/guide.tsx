"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { View } from "../types";

const STEPS = [
  "Join as Maya here, and join as Arjun in a private window.",
  "Press Start agents. Copy Agent finishes in about 10 seconds. Pricing Agent takes about a minute.",
  "While Pricing Agent writes, Maya changes the target customer to Enterprise IT teams. Arjun confirms it.",
  "Watch the work written from the old plan get marked Out of date. Approving it is locked.",
  "Press Restart on Copy Agent to clear its memory. It rebuilds what it knows from saved records and catches up alone.",
  "Press Redo with latest on Pricing. It stops and asks a question. One person answers, the other confirms.",
  "Approve the new drafts, then publish the page and open its public link.",
];

// Collapsible walkthrough of the demo for someone seeing it for the first time.
export function Guide() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="guide-heading" className="rounded-2xl border border-border bg-surface shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left sm:px-5">
        <span id="guide-heading" className="text-sm font-bold">
          How to run the 7-step demo
        </span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ol className="list-decimal space-y-2 px-4 pb-5 pl-9 text-sm sm:px-5 sm:pl-10">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

// Honest status of the demo: what is real, what is scripted, and what needs setup.
export function RealityPanel({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="reality-heading" className="rounded-2xl border border-border bg-surface shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left sm:px-5">
        <span id="reality-heading" className="text-sm font-bold">
          What is real and what is simulated
        </span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ul className="list-disc space-y-2 px-4 pb-5 pl-9 text-sm text-muted-foreground sm:px-5 sm:pl-10">
          <li>Real: decisions, versions, drafts, approvals, the activity log, publishing, and the database behind them.</li>
          <li>Real: agent timing, the plan each agent read when it started, and the check that blocks outdated work.</li>
          <li>
            {view.aiLive
              ? "Live: section text comes from the configured AI service."
              : "Simulated: section text is prewritten because no AI service is connected. The wording still follows the plan each agent read."}
          </li>
          <li>Simulated: Maya and Arjun are two browser windows, not real accounts. Online dots show who has this page open.</li>
        </ul>
      ) : null}
    </section>
  );
}

export function ModeBadge({ live }: { live: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${live ? "bg-agent-soft text-agent" : "bg-muted text-muted-foreground"}`}>
      {live ? "Live AI" : "Scripted text"}
    </span>
  );
}
