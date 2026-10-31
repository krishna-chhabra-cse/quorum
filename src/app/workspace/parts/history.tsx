import type { View } from "../types";

// Plain-English event log. Technical details are kept behind a disclosure.
export function HistoryPanel({ view }: { view: View }) {
  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      <div>
        <h2 id="history-heading" className="text-lg font-semibold">
          What happened
        </h2>
        <p className="text-sm text-muted-foreground">Every decision, approval, and agent step, newest first.</p>
      </div>
      {view.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ol className="space-y-2">
          {view.events.map((e) => (
            <li key={e.seq} className="rounded-md border border-border p-3 text-sm">
              <p>{e.plain}</p>
              {e.technical ? (
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-1 break-all font-mono">{e.technical}</p>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
