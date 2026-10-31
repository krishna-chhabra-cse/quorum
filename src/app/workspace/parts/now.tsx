"use client";

import { ArrowDown, Check, CircleAlert, ExternalLink, Hourglass, Play, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Act, View } from "../types";
import { buildStory, type Step, type Story } from "../story";

const TONE = {
  action: { box: "border-warn/30 bg-warn-soft", icon: "bg-warn text-surface", Icon: CircleAlert, label: "Your turn" },
  waiting: { box: "border-info/30 bg-info-soft", icon: "bg-info text-surface", Icon: Hourglass, label: "Waiting" },
  working: { box: "border-agent/30 bg-agent-soft", icon: "bg-agent text-surface", Icon: Sparkles, label: "In progress" },
  good: { box: "border-good/30 bg-good-soft", icon: "bg-good text-surface", Icon: Check, label: "All good" },
};

// The first thing anyone reads: what is happening now, and what to do next.
export function NowBanner({ view, busy, act }: { view: View; busy: string | null; act: Act }) {
  const story = buildStory(view);
  const t = TONE[story.tone];
  return (
    <section aria-labelledby="now-heading" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className={`flex flex-wrap items-center gap-4 border-b p-5 sm:p-6 ${t.box}`} role="status">
        <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
          <t.Icon size={22} />
        </span>
        <div className="min-w-[240px] flex-1">
          <p className="text-xs font-bold tracking-wide uppercase opacity-75">{t.label}</p>
          <h1 id="now-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
            {story.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm">{story.detail}</p>
        </div>
        <Cta story={story} busy={busy} act={act} />
      </div>
      <ProgressTrail steps={story.steps} />
    </section>
  );
}

function Cta({ story, busy, act }: { story: Story; busy: string | null; act: Act }) {
  const cta = story.cta;
  if (!cta) return null;
  if (cta.kind === "start") {
    return (
      <Button size="lg" onClick={() => act("startAgents", {}, "Both agents are writing now.")} disabled={busy !== null}>
        <Play size={17} aria-hidden="true" /> Start agents
      </Button>
    );
  }
  if (cta.kind === "publish") {
    return (
      <Button size="lg" onClick={() => act("publish", {}, "Published. Anyone with the link can read it.")} disabled={busy !== null}>
        <Rocket size={17} aria-hidden="true" /> Publish page
      </Button>
    );
  }
  if (cta.kind === "page") {
    return (
      <a href={`/published/${cta.token}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90">
        Open published page <ExternalLink size={16} aria-hidden="true" />
      </a>
    );
  }
  return (
    <a href="#attention" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90">
      See what needs you <ArrowDown size={16} aria-hidden="true" />
    </a>
  );
}

// The seven demo stages. Each one lights up from real state, so progress cannot be faked.
function ProgressTrail({ steps }: { steps: Step[] }) {
  return (
    <ol aria-label="Progress through the demo" className="grid grid-cols-2 gap-x-3 gap-y-4 p-4 sm:grid-cols-4 sm:p-5 lg:grid-cols-7">
      {steps.map((s, i) => (
        <li key={s.title} aria-current={s.state === "now" ? "step" : undefined} className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              s.state === "done" ? "bg-good text-surface" : s.state === "now" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {s.state === "done" ? <Check size={15} /> : i + 1}
          </span>
          <span>
            <span className={`block text-sm leading-tight font-semibold ${s.state === "todo" ? "text-muted-foreground" : ""}`}>{s.title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{s.hint}</span>
            <span className="sr-only">{s.state === "done" ? "Done" : s.state === "now" ? "Happening now" : "Not started"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
