"use client";

import { Check, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";

export type NoticeState = { tone: "ok" | "warn"; text: string } | null;

// A short result message for the last action. Success clears itself; refusals stay until read.
export function Notice({ state, onClose }: { state: NoticeState; onClose: () => void }) {
  useEffect(() => {
    if (state?.tone !== "ok") return;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [state, onClose]);

  if (!state) return null;
  const ok = state.tone === "ok";
  return (
    <div role={ok ? "status" : "alert"} className="fixed right-4 bottom-4 z-30 flex max-w-sm items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5 text-sm shadow-card">
      {ok ? <Check size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-good" /> : <TriangleAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-bad" />}
      <p className="font-medium">{state.text}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
