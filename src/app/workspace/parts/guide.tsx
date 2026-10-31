"use client";

import { useState } from "react";
import type { View } from "../types";

const STEPS = [
  "Pick who you are on the join page. Open this page in a second window as the other person.",
  "Look at the page sections. Each one shows what it depends on.",
  "Propose a change to a decision, such as the target customer. Write the new value and a reason.",
  "The other person confirms. Only the sections that depend on that decision are marked Stale.",
  "Click Redo with latest on a stale section. The agent reads the new versions and writes again.",
  "Pricing asks a Decision Card question. One person answers, the other confirms, then the pricing decision is updated.",
  "When nothing is waiting, Publish the page and open the published copy.",
];

// Collapsible, plain-language walkthrough of the demo.
export function Guide() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="guide-heading" className="rounded-lg border border-border bg-background p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span id="guide-heading" className="text-base font-semibold">
          How to run the 7-step demo
        </span>
        <span className="text-sm text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
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
    <section aria-labelledby="reality-heading" className="rounded-lg border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-left text-base font-semibold"
          id="reality-heading"
        >
          What is real and what is simulated
        </button>
        <ModeBadge live={view.aiLive} />
      </div>
      {open ? (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Real: decisions, versions, proposals, approvals, the audit log, publishing, and the database writes behind them.</li>
          <li>
            Real: the agents' run timing and the moment each run reads decision versions. Each proposal copies those versions.
          </li>
          <li>
            {view.aiLive
              ? "Live: section text comes from the configured AI service."
              : "Simulated: section text uses prewritten copy, because no AI service is configured. The wording still follows the decisions each run read."}
          </li>
          <li>Simulated: the two people are two browser windows, not real accounts. Presence dots show who has this page open.</li>
        </ul>
      ) : null}
    </section>
  );
}

export function ModeBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        live ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
      }`}
    >
      {live ? "Live AI" : "Scripted text"}
    </span>
  );
}
