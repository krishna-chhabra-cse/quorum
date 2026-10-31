export type Snapshot = {
  publishedBy: string;
  sections: { id: string; title: string; text: string; dependsOn: string[] }[];
  decisions: { id: string; title: string; version: number; value: string }[];
};

// Public, read-only rendering of one published snapshot. Only settled text appears here.
export function PublishedView({ snapshot, publishedAt }: { snapshot: Snapshot; publishedAt: string }) {
  const when = new Date(publishedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <main className="mx-auto max-w-3xl space-y-10 px-5 py-12">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-sm font-medium text-muted-foreground">Published with Quorum on {when}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Slate</h1>
        <p className="text-muted-foreground">An AI meeting notes app for college students.</p>
      </header>

      {snapshot.sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`h-${s.id}`} className="space-y-2">
          <h2 id={`h-${s.id}`} className="text-xl font-semibold">
            {s.title}
          </h2>
          <p className="text-base leading-relaxed">{s.text}</p>
        </section>
      ))}

      <section aria-labelledby="decisions-h" className="space-y-3 border-t border-border pt-6">
        <h2 id="decisions-h" className="text-base font-semibold">
          Decisions behind this page
        </h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {snapshot.decisions.map((d) => (
            <li key={d.id}>
              {d.id} {d.title}: {d.value} (version {d.version})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
