import { Bot, Lock, TriangleAlert } from "lucide-react";
import type { Section, View } from "../types";
import { StatusBadge } from "./status";

// The product everyone is building, shown as a real page rather than a list of records.
export function Sections({ view }: { view: View }) {
  const by = Object.fromEntries(view.sections.map((s) => [s.id, s]));
  return (
    <section aria-labelledby="sections-heading" className="space-y-3">
      <div>
        <h2 id="sections-heading" className="text-lg font-bold">
          The page you are building
        </h2>
        <p className="text-sm text-muted-foreground">This is what would go live. Agents can only suggest changes, and a person approves each one.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-2 flex flex-1 items-center gap-1.5 rounded-md bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Lock size={11} /> slate.app
          </span>
        </div>
        {by.hero ? <Frame s={by.hero} view={view}><Hero text={by.hero.text} /></Frame> : null}
        {by.features ? <Frame s={by.features} view={view}><Features text={by.features.text} /></Frame> : null}
        {by.pricing ? <Frame s={by.pricing} view={view}><Pricing text={by.pricing.text} /></Frame> : null}
        {by.footer ? <Frame s={by.footer} view={view}><Footer text={by.footer.text} /></Frame> : null}
      </div>
    </section>
  );
}

function Frame({ s, view, children }: { s: Section; view: View; children: React.ReactNode }) {
  const stale = s.status === "stale";
  const owner = view.agents.find((a) => a.id === s.agentId)?.name ?? "A person";
  const needs = s.dependsOn.map((d) => view.decisions.find((x) => x.id === d)?.title.toLowerCase() ?? d).join(" and ");
  const changed = /D\d/.exec(s.staleReason ?? "")?.[0];
  const changedTitle = view.decisions.find((d) => d.id === changed)?.title.toLowerCase();
  return (
    <div id={`section-${s.id}`} className={`scroll-mt-24 border-b border-border last:border-b-0 ${stale ? "bg-bad-soft/50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 sm:px-7">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Bot size={14} aria-hidden="true" /> {s.title} · written by {owner}
        </p>
        <StatusBadge status={s.status} />
      </div>
      <div className={`px-5 py-4 sm:px-7 ${stale ? "opacity-75" : ""}`}>{children}</div>
      {stale ? (
        <p className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-sm text-bad sm:mx-7">
          <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            The {changedTitle ?? "plan"} changed, so this text no longer matches. It stays visible until {owner} rewrites it and a person approves.
          </span>
        </p>
      ) : (
        <p className="px-5 pb-4 text-xs text-muted-foreground sm:px-7">Relies on the {needs}.</p>
      )}
    </div>
  );
}

function Hero({ text }: { text: string }) {
  const [first, ...rest] = splitSentences(text);
  return (
    <div className="py-3">
      <h3 className="max-w-2xl text-2xl leading-tight font-bold tracking-tight sm:text-3xl">{first}</h3>
      {rest.length > 0 ? <p className="mt-2 max-w-2xl text-muted-foreground">{rest.join(" ")}</p> : null}
    </div>
  );
}

function Features({ text }: { text: string }) {
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {splitSentences(text).map((f) => (
        <li key={f} className="rounded-xl bg-muted p-4 text-sm leading-relaxed font-medium">
          {f}
        </li>
      ))}
    </ul>
  );
}

function Pricing({ text }: { text: string }) {
  const [first, ...rest] = splitSentences(text);
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-lg font-bold">{first}</p>
      {rest.length > 0 ? <p className="mt-1 text-sm text-muted-foreground">{rest.join(" ")}</p> : null}
    </div>
  );
}

function Footer({ text }: { text: string }) {
  return <p className="rounded-xl bg-foreground p-5 text-center font-semibold text-background">{text}</p>;
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}
