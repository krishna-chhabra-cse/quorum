"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { callApi, clearPerson, postAction, savedPerson } from "@/lib/client";
import { Header } from "./parts/header";
import { NowBanner } from "./parts/now";
import { Sections } from "./parts/sections";
import { DecisionsPanel } from "./parts/decisions";
import { QueuePanel } from "./parts/queue";
import { AgentsPanel } from "./parts/agents";
import { HistoryPanel } from "./parts/history";
import { PublishPanel } from "./parts/publish";
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
  const closeNotice = useCallback(() => setNotice(null), []);

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
    // The next poll is scheduled only after the last one finishes, so slow responses never pile up.
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await load();
      if (alive.current) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      alive.current = false;
      clearTimeout(timer);
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
    <>
      <Header view={view} busy={busy} act={act} />
      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-5 sm:px-6">
        <NowBanner view={view} busy={busy} act={act} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[300px_minmax(0,1fr)_400px]">
          <div className="order-3 space-y-6 lg:col-start-1 lg:row-start-2 xl:col-start-1 xl:row-start-1">
            <DecisionsPanel view={view} act={act} />
          </div>
          <div className="order-2 min-w-0 space-y-6 lg:col-start-1 lg:row-start-1 xl:col-start-2">
            <Sections view={view} />
          </div>
          <div className="order-1 space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:col-start-3 xl:row-span-1">
            <QueuePanel view={view} act={act} />
            <AgentsPanel view={view} act={act} />
            <PublishPanel view={view} busy={busy} act={act} />
          </div>
        </div>
        <HistoryPanel view={view} />
        <div className="grid gap-3 md:grid-cols-2">
          <Guide />
          <RealityPanel view={view} />
        </div>
      </main>
      <Notice state={notice} onClose={closeNotice} />
    </>
  );
}
