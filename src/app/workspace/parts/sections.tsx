import type { Act, Section, View } from "../types";
import { StatusBadge } from "./status";

// The live page, one card per section. Stale sections explain why and link to next steps.
export function Sections({ view, act: _act }: { view: View; act: Act }) {
  const names = Object.fromEntries(view.decisions.map((d) => [d.id, d.title]));
  return (
    <section aria-labelledby="sections-heading" className="space-y-4">
      <div>
        <h2 id="sections-heading" className="text-lg font-semibold">
          The page, section by section
        </h2>
        <p className="text-sm text-muted-foreground">
          This is the text that would go live. A section is only Current when it was written against the decisions in
          force now.
        </p>
      </div>
      <ul className="space-y-3">
        {view.sections.map((s) => (
          <SectionCard key={s.id} s={s} names={names} agentName={agentName(view, s)} />
        ))}
      </ul>
    </section>
  );
}

function agentName(view: View, s: Section): string | null {
  if (!s.agentId) return null;
  return view.agents.find((a) => a.id === s.agentId)?.name ?? null;
}

function SectionCard({ s, names, agentName }: { s: Section; names: Record<string, string>; agentName: string | null }) {
  return (
    <li id={`section-${s.id}`} className="scroll-mt-6 rounded-lg border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{s.title}</h3>
        <StatusBadge status={s.status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed">{s.text}</p>
      <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <dt className="inline font-medium">Written by: </dt>
          <dd className="inline">{agentName ?? "A person"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Depends on: </dt>
          <dd className="inline">{s.dependsOn.map((d) => `${d} ${names[d] ?? ""}`.trim()).join(", ") || "Nothing"}</dd>
        </div>
      </dl>
      {s.status === "stale" && s.staleReason ? (
        <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
          <strong>Out of date.</strong> {s.staleReason} Pick a new run for {agentName ?? "this section"} below, or edit by
          hand after the decision is settled.
        </p>
      ) : null}
    </li>
  );
}
