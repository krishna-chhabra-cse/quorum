"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Act, Change, Decision, View } from "../types";
import { StatusBadge } from "./status";

// The decision ledger. Anyone can ask for a change; the other person confirms it.
export function DecisionsPanel({ view, act }: { view: View; act: Act }) {
  return (
    <section aria-labelledby="decisions-heading" className="space-y-4">
      <div>
        <h2 id="decisions-heading" className="text-lg font-semibold">
          Decisions
        </h2>
        <p className="text-sm text-muted-foreground">
          Changing a decision does not change the page. It marks the sections that depended on it, then a person decides
          what happens next.
        </p>
      </div>
      <ul className="space-y-3">
        {view.decisions.map((d) => (
          <DecisionRow key={d.id} d={d} changes={view.changes.filter((c) => c.decisionId === d.id)} me={view.me} act={act} />
        ))}
      </ul>
    </section>
  );
}

function DecisionRow({ d, changes, me, act }: { d: Decision; changes: Change[]; me: string; act: Act }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const pending = changes.find((c) => c.status === "open");
  const requestable = !pending;
  const canConfirm = pending && pending.requestedBy !== me;

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
    <li id={`ledger-${d.id}`} className="scroll-mt-6 rounded-lg border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {d.id} · Owner: {d.ownerName}
          </p>
          <h3 className="text-base font-semibold">{d.title}</h3>
          <p className="text-sm">
            {d.value} <span className="text-muted-foreground">(version {d.version})</span>
          </p>
          <p className="text-xs text-muted-foreground">{d.question}</p>
        </div>
        {pending ? <StatusBadge status="open" /> : null}
      </div>

      {pending ? (
        <div className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
          <p>
            {pending.requestedBy === "maya" ? "Maya" : "Arjun"} asked to change this to{" "}
            <strong>&ldquo;{pending.requestedValue}&rdquo;</strong>. Reason: {pending.reason}
          </p>
          <p className="mt-1 text-muted-foreground">
            Affects: {d.affectedSections.join(", ") || "no sections"}.
          </p>
          {canConfirm ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => act("confirmChange", { changeId: pending.id, baseVersion: d.version }, "Confirmed. The decision is updated.")}>
                Confirm change
              </Button>
              <Button variant="outline" size="sm" onClick={() => act("rejectChange", { changeId: pending.id }, "Rejected. The decision stays as it was.")}>
                Reject
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">You asked for this change, so the other person needs to confirm it.</p>
          )}
        </div>
      ) : null}

      {requestable ? (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Cancel" : "Propose a change"}
          </Button>
          {open ? (
            <form onSubmit={request} className="mt-3 grid gap-3 sm:max-w-xl">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">New value</span>
                <input
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3"
                  placeholder={d.value}
                />
              </label>
              <div className="rounded-md border border-border bg-muted p-3 text-sm" aria-live="polite">
                <p className="font-medium">Impact preview</p>
                <p className="mt-1 text-muted-foreground">
                  If confirmed, these will be marked out of date: {d.affectedSections.join(", ") || "no sections"}. Nothing
                  on the live page changes until someone decides what to do next.
                </p>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Why</span>
                <input
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3"
                  placeholder="One sentence for the other person"
                />
              </label>
              <div>
                <Button type="submit" size="sm">
                  Send for confirmation
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">History ({d.history.length} versions)</summary>
        <ol className="mt-2 space-y-1 text-muted-foreground">
          {d.history.map((h) => (
            <li key={h.version}>
              v{h.version}: {h.value}
              {h.reason ? ` · ${h.reason}` : ""}
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}
