"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { callApi, savePerson, type Person } from "@/lib/client";

const PEOPLE: { id: Person; name: string; role: string; blurb: string }[] = [
  { id: "maya", name: "Maya", role: "Founder", blurb: "Owns the target customer and the pricing model." },
  { id: "arjun", name: "Arjun", role: "Product Designer", blurb: "Owns the brand tone." },
];

export function JoinForm() {
  const router = useRouter();
  const [busy, setBusy] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function join(person: Person) {
    setBusy(person);
    setError(null);
    const res = await callApi<{ person?: Person }>("/api/join", {
      method: "POST",
      body: JSON.stringify({ person }),
    });
    if (!res.ok) {
      setBusy(null);
      setError(res.message ?? "Could not join. Try again.");
      return;
    }
    savePerson(person);
    router.push("/workspace");
  }

  return (
    <section aria-labelledby="pick-heading" className="space-y-4">
      <div>
        <h2 id="pick-heading" className="text-lg font-bold">
          Choose who you are
        </h2>
        <p className="text-sm text-muted-foreground">Open a second, private window and join as the other person to try it properly.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PEOPLE.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => join(p.id)}
            disabled={busy !== null}
            className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-surface p-5 text-left shadow-card transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            <span className="text-lg font-bold">{p.name}</span>
            <span className="text-sm font-medium text-muted-foreground">{p.role}</span>
            <span className="text-sm text-muted-foreground">{p.blurb}</span>
            <span className="mt-3 text-sm font-bold text-primary">{busy === p.id ? "Joining..." : `Join as ${p.name}`}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>No password needed. This is a demo.</span>
        <Button variant="ghost" size="sm" onClick={() => router.push("/published")}>
          Read the published page
        </Button>
      </div>
    </section>
  );
}
