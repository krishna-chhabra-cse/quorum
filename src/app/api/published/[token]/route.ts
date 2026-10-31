import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db/setup";
import { one } from "@/server/tx";
import { withTx } from "@/server/tx";
import { errorResponse } from "@/server/api";
import { HttpError } from "@/server/errors";

export const dynamic = "force-dynamic";

// Public read of a published snapshot. Anyone with the link can see it, nobody can edit it.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    if (!/^[a-z0-9]{8,32}$/.test(token)) throw new HttpError(404, "That page does not exist.");
    await ensureDatabase();
    const row = await withTx((c) =>
      one<{ snapshot: unknown; created_at: string }>(
        c,
        `SELECT snapshot, created_at FROM published_pages WHERE token = $1`,
        [token],
      ),
    );
    if (!row) throw new HttpError(404, "That page does not exist.");
    return NextResponse.json({ ok: true, snapshot: row.snapshot, publishedAt: row.created_at });
  } catch (err) {
    return errorResponse(err);
  }
}
