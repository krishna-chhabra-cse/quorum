"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Act, Agent, ContextPacket as Packet, View } from "../types";
import { Avatar } from "./avatar";
import { StatusBadge } from "./status";

// What each agent is doing right now, and what it knows.
export function AgentsPanel({ view, act }: { view: View; act: Act }) {
  return (
    <section aria-labelledby="agents-heading" className="space-y-3">
      <div>
        <h2 id="agents-heading" className="text-lg font-bold">
          AI agents
        </h2>
        <p className="text-sm text-muted-foreground">Each agent reads the plan when it starts. Restart wipes its memory to show it can recover.</p>
      </div>
      <ul className="space-y-3">
        {view.agents.map((a) => (
          <AgentRow key={a.id} a={a} view={view} act={act} />
        ))}
      </ul>
    </section>
  );
}

function AgentRow({ a, view, act }: { a: Agent; view: View; act: Act }) {
  const working = a.status === "working";
  const sections = a.sectionIds.map((id) => view.sections.find((s) => s.id === id)?.title ?? id).join(", ");
  const pct = Math.min(100, Math.round((a.clockSec / Math.max(1, a.submitAfterSec)) * 100));
  return (
    <li className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Avatar actor={a.id} size="sm" /> {a.name}
        </h3>
        <StatusBadge status={a.status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Writes {sections}</p>
      {working ? (
        <div className="mt-2">
          <p className="text-sm font-medium">{a.stepLabel}...</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${a.name} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-agent transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : a.status === "waiting" ? (
        <p className="mt-2 text-sm font-medium">{a.stepLabel}</p>
      ) : null}
      {a.memoryReset ? <p className="mt-2 rounded-lg bg-agent-soft p-2.5 text-xs text-agent">Memory cleared. It rebuilt what it knows from saved records.</p> : null}
      <ContextPacketView a={a} view={view} />
      <Button className="mt-3" size="sm" variant="outline" onClick={() => act("restart", { agentId: a.id }, `${a.name} restarted with a clean memory.`)}>
        <RotateCcw size={14} aria-hidden="true" /> Restart
      </Button>
    </li>
  );
}

// The context packet is what the agent is allowed to know for this run, in plain language.
function ContextPacketView({ a, view }: { a: Agent; view: View }) {
  const packet = a.contextPacket as Partial<Packet> | null;
  if (!packet?.readVersions) return null;
  const rows = Object.entries(packet.readVersions).map(([id, v]) => {
    const d = view.decisions.find((x) => x.id === id);
    const value = packet.decisions?.find((x) => x.id === id)?.value ?? d?.history.find((h) => h.version === v)?.value;
    return { id, title: d?.title ?? id, v, value, behind: d ? d.version !== v : false };
  });
  const approved = packet.approvedSections ?? [];
  const rejected = packet.rejectedIdeas ?? [];
  const notes = packet.humanNotes ?? [];
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">What it remembers (Context Packet, run {packet.attempt ?? 1})</summary>
      <div className="mt-3 space-y-3 text-xs">
        <Block title="Its current task">
          <p>{packet.openTask ?? "Write the sections this agent owns."}</p>
        </Block>
        <Block title="The plan it read">
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.id}>
                <span className="font-semibold">{r.title}:</span> {r.value} {r.behind ? <span className="font-semibold text-bad">(now outdated)</span> : null}
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Approved text it can build on">
          {approved.length === 0 ? <p className="text-muted-foreground">Nothing yet.</p> : null}
          <ul className="space-y-1">
            {approved.map((s) => (
              <li key={s.id}>
                <span className="font-semibold">{s.title}:</span> {s.text}
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Ideas it must not repeat">
          {rejected.length === 0 ? <p className="text-muted-foreground">None.</p> : null}
          <ul className="space-y-1">
            {rejected.map((r, i) => (
              <li key={i}>
                <span className="font-semibold">{r.section}:</span> {r.idea}
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Notes from people">
          {notes.length === 0 ? <p className="text-muted-foreground">None.</p> : null}
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={i}>
                {n.from === "maya" ? "Maya" : n.from === "arjun" ? "Arjun" : n.from}: {n.note}
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </details>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
