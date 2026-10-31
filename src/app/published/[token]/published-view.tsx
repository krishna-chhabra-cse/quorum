import { CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export type Snapshot = {
  publishedBy: string;
  sections: { id: string; title: string; text: string; dependsOn: string[]; source?: string; approvedBy?: string | null }[];
  decisions: { id: string; title: string; version: number; value: string }[];
  changes?: { title: string; value: string; reason: string | null; requestedBy: string | null; confirmedBy: string | null }[];
  timeline?: { plain: string; at: string }[];
};

const SOURCE: Record<string, string> = { live: "Live AI", scripted: "Scripted text", starting: "Starting text" };

// Public, read-only rendering of one published snapshot. Only settled text appears here.
export function PublishedView({ snapshot, publishedAt }: { snapshot: Snapshot; publishedAt: string }) {
  const when = new Date(publishedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const audience = snapshot.decisions.find((d) => d.id === "D1")?.value;
  const name = snapshot.publishedBy === "arjun" ? "Arjun" : snapshot.publishedBy === "maya" ? "Maya" : snapshot.publishedBy;
  const changes = snapshot.changes ?? [];
  const timeline = snapshot.timeline ?? [];
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <header className="rounded-2xl bg-foreground p-7 text-background sm:p-9">
        <p className="text-sm font-medium opacity-75">Published by {name} with Quorum · {when}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Slate</h1>
        <p className="mt-1 text-lg opacity-85">AI meeting notes{audience ? ` for ${audience}` : ""}.</p>
      </header>

      <div className="space-y-4">
        {snapshot.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`h-${s.id}`} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`h-${s.id}`} className="text-sm font-bold text-muted-foreground">
                {s.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {SOURCE[s.source ?? ""] ?? "Starting text"}
                {s.approvedBy ? ` · Approved by ${s.approvedBy}` : ""}
              </p>
            </div>
            <p className="mt-2 text-lg leading-relaxed">{s.text}</p>
          </section>
        ))}
      </div>

      {changes.length > 0 ? (
        <section aria-labelledby="changes-h" className="space-y-3">
          <h2 id="changes-h" className="text-lg font-bold">
            What changed, and why
          </h2>
          <ul className="space-y-2">
            {changes.map((c, i) => (
              <li key={i} className="rounded-xl bg-good-soft p-4 text-sm">
                <p className="font-semibold">
                  {c.title} changed to {c.value}
                </p>
                <p className="mt-1">
                  {c.reason ? `${c.reason} ` : ""}
                  {c.requestedBy ? `Requested by ${c.requestedBy}` : ""}
                  {c.confirmedBy ? `, confirmed by ${c.confirmedBy}` : ""}.
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="decisions-h" className="space-y-3">
        <h2 id="decisions-h" className="text-lg font-bold">
          Decisions behind this page
        </h2>
        <ul className="space-y-1.5 text-sm">
          {snapshot.decisions.map((d) => (
            <li key={d.id} className="flex items-start gap-2">
              <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-good" />
              <span>
                <span className="font-semibold">{d.title}:</span> {d.value} <span className="text-muted-foreground">(version {d.version})</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {timeline.length > 0 ? (
        <section aria-labelledby="timeline-h" className="space-y-3">
          <h2 id="timeline-h" className="text-lg font-bold">
            How it got here
          </h2>
          <ol className="space-y-2 border-l-2 border-border pl-4 text-sm">
            {timeline.map((e, i) => (
              <li key={i}>
                {e.plain} <span className="text-xs text-muted-foreground">{new Date(e.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
