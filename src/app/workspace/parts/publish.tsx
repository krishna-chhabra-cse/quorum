"use client";

import { ExternalLink, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Act, View } from "../types";

// Publishing stays locked until everything is settled, and says exactly what is in the way.
export function PublishPanel({ view, busy, act }: { view: View; busy: string | null; act: Act }) {
  const ready = view.blockers.length === 0;
  const last = view.pages[0];
  return (
    <section aria-labelledby="publish-heading" className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <h2 id="publish-heading" className="text-sm font-bold">
        Publish the page
      </h2>
      {ready ? (
        <p className="mt-1 text-sm text-muted-foreground">Nothing is waiting, so this page can go live.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Locked until these are settled:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {view.blockers.map((b, i) => (
              <li key={i}>
                <a href={b.href} className="underline underline-offset-2 hover:text-primary">
                  {plain(b.text, view)}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => act("publish", {}, "Published. Anyone with the link can read it.")} disabled={!ready || busy !== null}>
          <Rocket size={15} aria-hidden="true" /> {busy === "publish" ? "Publishing..." : "Publish page"}
        </Button>
        {last ? (
          <a href={`/published/${last.token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2">
            Latest published page <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

// Blocker text comes from the server with internal ids, so names are swapped in for reading.
function plain(text: string, view: View) {
  let out = text;
  for (const d of view.decisions) out = out.replaceAll(` ${d.id} `, ` the ${d.title.toLowerCase()} `).replaceAll(` ${d.id}.`, ` the ${d.title.toLowerCase()}.`);
  for (const s of view.sections) out = out.replaceAll(` ${s.id} `, ` ${s.title} `);
  return out;
}
