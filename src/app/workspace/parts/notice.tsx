"use client";

export type NoticeState = { tone: "ok" | "warn"; text: string } | null;

// A single, plain-language result line for the last action.
export function Notice({ state, onClose }: { state: NoticeState; onClose: () => void }) {
  if (!state) return null;
  const tone = state.tone === "ok" ? "border-border bg-muted" : "border-foreground/30 bg-background";
  return (
    <div role="status" className={`flex items-start justify-between gap-4 rounded-md border p-4 text-sm ${tone}`}>
      <p>{state.text}</p>
      <button type="button" onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
        Dismiss
      </button>
    </div>
  );
}
