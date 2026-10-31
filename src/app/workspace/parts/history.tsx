"use client";

import { useState } from "react";
import type { View } from "../types";
import { Avatar } from "./avatar";

// Small agent progress lines look like "Copy Agent: Drafting text."
const isMinor = (plain: string) => /^(Copy|Pricing) Agent: /.test(plain) || plain.startsWith("Used scripted text");

// Plain-English activity log, newest first. Technical details stay behind a disclosure.
export function HistoryPanel({ view }: { view: View }) {
  const [all, setAll] = useState(false);
  const events = all ? view.events : view.events.filter((e) => !isMinor(e.plain));
  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="history-heading" className="text-lg font-bold">
            What happened
          </h2>
          <p className="text-sm text-muted-foreground">Every decision and approval, newest first.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show every agent step
        </label>
      </div>
      <ol className="grid gap-x-6 gap-y-1 rounded-2xl border border-border bg-surface p-3 shadow-card md:grid-cols-2 sm:p-4">
        {events.map((e) => (
          <li key={e.seq} className="flex items-start gap-2.5 rounded-lg p-2">
            <Avatar actor={e.actor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{e.plain}</p>
              <p className="text-xs text-muted-foreground">{time(e.createdAt)}</p>
              {e.technical ? (
                <details className="mt-0.5 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Technical details</summary>
                  <p className="mt-1 font-mono break-all">{e.technical}</p>
                </details>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}
