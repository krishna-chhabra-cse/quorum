import Link from "next/link";

export default function PublishedIndex() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Published pages</h1>
      <p className="text-muted-foreground">
        A published page is a frozen copy of the settled text and the decisions behind it. Open the link from the
        workspace to read the version you published.
      </p>
      <Link href="/join" className="text-sm underline underline-offset-4 hover:text-foreground">
        Back to the workspace
      </Link>
    </main>
  );
}
