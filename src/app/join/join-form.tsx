"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { callApi, savePerson, type Person } from "@/lib/client";

const PEOPLE: { id: Person; name: string; role: string; blurb: string }[] = [
  { id: "maya", name: "Maya", role: "Founder", blurb: "Owns the target customer and the pricing model." },
  { id: "arjun", name: "Arjun", role: "Product Designer", blurb: "Owns the brand tone and the footer call to action." },
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
      <h2 id="pick-heading" className="text-lg font-semibold">
        Who are you?
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {PEOPLE.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => join(p.id)}
            disabled={busy !== null}
            className="flex flex-col items-start gap-1 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            <span className="text-base font-semibold">
              {p.name} <span className="font-normal text-muted-foreground">· {p.role}</span>
            </span>
            <span className="text-sm text-muted-foreground">{p.blurb}</span>
            <span className="mt-2 text-sm font-medium">{busy === p.id ? "Joining..." : `Join as ${p.name}`}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-border bg-muted p-3 text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>Your choice is remembered on this device.</span>
        <Button variant="ghost" size="sm" onClick={() => router.push("/published")}>
          Read the published page
        </Button>
      </div>
    </section>
  );
}
