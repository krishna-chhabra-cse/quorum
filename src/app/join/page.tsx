import type { Metadata } from "next";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join the Slate launch page | Quorum",
  description: "Pick who you are to join the shared workspace for the Slate launch page.",
};

export default function JoinPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-5 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Quorum</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Build the Slate launch page together</h1>
        <p className="text-base text-muted-foreground">
          Two people and two AI agents share one page. When a decision changes, Quorum flags only the work that depended
          on it, so nothing goes out with stale text.
        </p>
      </header>
      <JoinForm />
    </main>
  );
}
