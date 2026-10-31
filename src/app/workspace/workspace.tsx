"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { callApi, clearPerson, postAction, savedPerson } from "@/lib/client";
import { Header } from "./parts/header";
import { Sections } from "./parts/sections";
import { DecisionsPanel } from "./parts/decisions";
import { QueuePanel } from "./parts/queue";
import { AgentsPanel } from "./parts/agents";
import { HistoryPanel } from "./parts/history";
import { Notice, type NoticeState } from "./parts/notice";
import { Guide, RealityPanel } from "./parts/guide";
import type { View } from "./types";

const POLL_MS = 2000;

// Owns the view state. Polls the server, ticks running agents, and reports results back.
export function Workspace() {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const res = await callApi<{ view?: View }>("/api/state");
    if (!alive.current) return;
    if (!res.ok || !res.view) {
      if (res.setup) setError(res.message ?? "The database is not ready.");
      else if (res.message?.includes("Pick who")) {
        clearPerson();
        router.replace("/join");
        return;
      } else setError(res.message ?? "Could not load the workspace.");
      return;
    }
    setError(null);
    setView(res.view);
  }, [router]);

  useEffect(() => {
    alive.current = true;
    if (!savedPerson()) {
      router.replace("/join");
      return;
    }
    load();
    const id = setInterval(async () => {
      await load();
    }, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [load, router]);

  // Runs one action, shows the outcome plainly, then refreshes.
  const act = useCallback(
    async (name: string, body: unknown = {}, success?: string) => {
      setBusy(name);
      const res = await postAction(name, body);
      setBusy(null);
      if (res.ok) setNotice({ tone: "ok", text: success ?? res.message ?? "Done." });
      else setNotice({ tone: "warn", text: res.message ?? "That did not work. Try again." });
      await load();
      return res;
    },
    [load],
  );

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-2xl font-semibold">The workspace is not ready</h1>
        <p role="alert" className="mt-3 rounded-md border border-border bg-muted p-4 text-sm">
          {error}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Check that DATABASE_URL is set and reachable, then reload this page.
        </p>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-muted-foreground">Loading the workspace...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
      <Header view={view} busy={busy} act={act} />
      <Guide />
      <RealityPanel view={view} />
      <Notice state={notice} onClose={() => setNotice(null)} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <Sections view={view} act={act} />
          <DecisionsPanel view={view} act={act} />
        </div>
        <div className="space-y-8">
          <QueuePanel view={view} act={act} />
          <AgentsPanel view={view} act={act} />
          <HistoryPanel view={view} />
        </div>
      </div>
    </main>
  );
}
