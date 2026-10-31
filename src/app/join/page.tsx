import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join the Slate launch page | Quorum",
  description: "Pick who you are to join the shared workspace for the Slate launch page.",
};

export default function JoinPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-5 py-12">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-primary">Quorum</p>
          <ThemeToggle />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Build with AI agents, without losing track.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Two people and two AI agents write one launch page together. If the plan changes, Quorum catches any work based on the old plan, and people stay in charge of what goes live.
        </p>
      </header>
      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          ["Agents draft", "They write from the team's decisions."],
          ["People change the plan", "Quorum flags only the work affected."],
          ["People approve", "Nothing goes live without a person."],
        ].map(([title, text], i) => (
          <li key={title} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm font-bold">
              {i + 1}. {title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
      <JoinForm />
    </main>
  );
}
