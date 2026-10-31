"use client";

import { Download, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearPerson } from "@/lib/client";
import type { Act, View } from "../types";
import { Avatar } from "./avatar";
import { ModeBadge } from "./guide";

// The top bar: where you are, who is here, and the demo tools.
export function Header({ view, busy, act }: { view: View; busy: string | null; act: Act }) {
  const router = useRouter();

  async function reset() {
    if (!window.confirm("Reset the demo to its starting state? Published links keep working.")) return;
    await act("reset", {}, "The demo is back to its starting state.");
  }

  function switchPerson() {
    clearPerson();
    router.replace("/join");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight">Quorum</p>
          <p className="text-xs text-muted-foreground">Slate launch page</p>
        </div>
        <ModeBadge live={view.aiLive} />
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <ul className="flex items-center gap-3" aria-label="Who is here">
            {view.people.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5 text-sm">
                <span className="relative">
                  <Avatar actor={p.id} size="sm" />
                  <span aria-hidden="true" className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${p.online ? "bg-good" : "bg-muted-foreground/40"}`} />
                </span>
                <span className="font-medium">{p.name}{p.you ? " (you)" : ""}</span>
                <span className="text-xs text-muted-foreground">{p.online ? "online" : "offline"}</span>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={switchPerson}>
            Switch person
          </Button>
          <a href="/api/export" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-muted">
            <Download size={15} aria-hidden="true" /> Export log (JSON)
          </a>
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy !== null}>
            <RotateCcw size={15} aria-hidden="true" /> Reset demo
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
