"use client";

import { Button } from "@/components/ui/button";
import type { Act, Agent, ContextPacket as Packet, View } from "../types";
import { StatusBadge } from "./status";

// Each agent's run status. A run only moves forward while the agent is working; it pauses while waiting for a human.
export function AgentsPanel({ view, act }: { view: View; act: Act }) {
  return (
    <section aria-labelledby="agents-heading" className="space-y-4">
      <div>
        <h2 id="agents-heading" className="text-lg font-semibold">
          Agents
        </h2>
        <p className="text-sm text-muted-foreground">
          An agent reads the decisions when its run starts and writes from those values. Restart clears its working memory
          and starts a fresh run from the database.
        </p>
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
  return (
    <li className="rounded-lg border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{a.name}</h3>
        <StatusBadge status={a.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Writes: {sections}</p>
      <p className="mt-2 text-sm">
        {a.stepLabel} {working ? <span className="text-muted-foreground">({a.clockSec}s of {a.submitAfterSec}s)</span> : null}
      </p>
      <ContextPacketView a={a} view={view} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => act("restart", { agentId: a.id }, a.name + " is starting a new run from current decisions.")}
        >
          Restart
        </Button>
        {a.memoryReset ? <span className="text-xs text-muted-foreground">Working memory was cleared on the last restart.</span> : null}
      </div>
    </li>
  );
}

// The context packet is what the agent is allowed to know for this run. Shown in full, in plain language.
function ContextPacketView({ a, view }: { a: Agent; view: View }) {
  const packet = a.contextPacket as Partial<Packet> | null;
  if (!packet?.readVersions) {
    return <p className="mt-2 text-xs text-muted-foreground">No run has read the decisions yet.</p>;
  }
  const versionRows = Object.entries(packet.readVersions).map(([id, v]) => {
    const d = view.decisions.find((x) => x.id === id);
    return { id, title: d?.title ?? id, v, current: d?.version ?? v };
  });
  const decisions = packet.decisions ?? [];
  const approved = packet.approvedSections ?? [];
  const rejected = packet.rejectedIdeas ?? [];
  const notes = packet.humanNotes ?? [];
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted-foreground">Context Packet (run {packet.attempt ?? 1})</summary>
      <div className="mt-3 space-y-4 text-xs">
        <Block title="Open task">
          <p>{packet.openTask ?? "Write the sections this agent owns."}</p>
        </Block>
        <Block title="Current decisions (versions read at run start)">
          <ul className="space-y-1">
            {versionRows.map((r) => (
              <li key={r.id}>
                <span className="font-medium">
                  {r.id} {r.title}
                </span>{" "}
                read at v{r.v}
                {r.current !== r.v ? <span className="font-medium text-foreground"> (now v{r.current})</span> : null}
                {decisions.find((d) => d.id === r.id) ? <span className="text-muted-foreground"> · {decisions.find((d) => d.id === r.id)?.value}</span> : null}
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Approved sections it may build on">
          {approved.length === 0 ? <p className="text-muted-foreground">None yet.</p> : null}
          <ul className="space-y-1">
            {approved.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.title}:</span> {s.text}
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Rejected or sent-back ideas it must not repeat">
          {rejected.length === 0 ? <p className="text-muted-foreground">None.</p> : null}
          <ul className="space-y-1">
            {rejected.map((r, i) => (
              <li key={i}>
                <span className="font-medium">{r.section}</span> ({r.outcome}): {r.idea}
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Human notes">
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
      <p className="font-medium">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
