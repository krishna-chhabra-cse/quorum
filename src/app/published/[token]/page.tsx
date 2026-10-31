import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureDatabase } from "@/db/setup";
import { one, withTx } from "@/server/tx";
import { PublishedView, type Snapshot } from "./published-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Slate launch page (published) | Quorum",
  description: "A published snapshot of the Slate launch page.",
};

// Read-only view of one published snapshot. Anyone with the link can view it.
export default async function PublishedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-z0-9]{8,32}$/.test(token)) notFound();
  await ensureDatabase();
  const row = await withTx((c) =>
    one<{ snapshot: Snapshot; created_at: string }>(c, `SELECT snapshot, created_at FROM published_pages WHERE token = $1`, [token]),
  );
  if (!row) notFound();
  return <PublishedView snapshot={row.snapshot} publishedAt={row.created_at} />;
}
