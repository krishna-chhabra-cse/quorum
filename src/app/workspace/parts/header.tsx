"use client";

import { Button } from "@/components/ui/button";
import { clearPerson } from "@/lib/client";
import { useRouter } from "next/navigation";
import type { Act, View } from "../types";

export function Header({ view, busy, act }: { view: View; busy: string | null; act: Act }) {
  const router = useRouter();
  const ready = view.blockers.length === 0;
  const published = view.pages[0];

  async function reset() {
    if (!window.confirm("Reset the demo to its starting state? Your decisions, proposals, and pages will be cleared.")) return;
    await act("reset", {}, "The demo is back to its starting state.");
  }

  function switchPerson() {
    clearPerson();
    router.replace("/join");
  }

  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Quorum · Slate launch page</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Build the page together</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Agents draft text from the decisions they read. When a decision changes, only the work that depended on it
            is marked stale.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeopleList view={view} />
          <span className="text-sm text-muted-foreground">
            You are <strong className="text-foreground">{view.me === "maya" ? "Maya" : "Arjun"}</strong>{" "}
            <button type="button" onClick={switchPerson} className="underline underline-offset-4 hover:text-foreground">
              switch
            </button>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => act("publish", {}, "Published.")}
          disabled={!ready || busy !== null}
          aria-describedby="publish-status"
        >
          {busy === "publish" ? "Publishing..." : "Publish page"}
        </Button>
        <p id="publish-status" className="text-sm text-muted-foreground">
          {ready
            ? "Nothing is waiting on a decision. Ready to publish."
            : `Publishing is paused: ${view.blockers.length} item${view.blockers.length === 1 ? "" : "s"} still need a decision.`}
        </p>
        {published ? (
          <a href={`/published/${published.token}`} className="text-sm underline underline-offset-4 hover:text-foreground">
            View last published page
          </a>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a
            href="/api/export"
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            Export log (JSON)
          </a>
          <Button variant="outline" size="sm" onClick={reset} disabled={busy !== null}>
            Reset demo
          </Button>
        </div>
      </div>
      {!ready ? (
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <p className="font-medium">Publish blockers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {view.blockers.map((b, i) => (
              <li key={i}>
                <a href={b.href} className="underline underline-offset-4 hover:text-foreground">
                  {b.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}

function PeopleList({ view }: { view: View }) {
  return (
    <ul className="flex items-center gap-3 text-sm" aria-label="Who is here">
      {view.people.map((p) => (
        <li key={p.id} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${p.online ? "bg-foreground" : "bg-muted-foreground/40"}`}
          />
          <span>{p.name}</span>
          <span className="sr-only">{p.online ? "online" : "offline"}</span>
        </li>
      ))}
    </ul>
  );
}
