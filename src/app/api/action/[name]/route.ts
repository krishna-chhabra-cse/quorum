import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db/setup";
import { errorResponse, readJson, requirePerson } from "@/server/api";
import { isAction, runAction } from "@/server/actions";
import { withTx } from "@/server/tx";
import { HttpError } from "@/server/errors";

export const dynamic = "force-dynamic";

// One endpoint per named action. Every call runs in a single transaction so a
// refused action leaves no half-written state behind.
export async function POST(req: Request, ctx: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await ctx.params;
    if (!isAction(name)) throw new HttpError(404, "That action does not exist.");
    const who = requirePerson(req);
    const body = await readJson(req);
    await ensureDatabase();
    const out = await withTx((c) => runAction(c, who, name, body));
    const status = out.ok ? 200 : out.status ?? 400;
    return NextResponse.json({ ok: out.ok, message: out.message, token: out.token }, { status });
  } catch (err) {
    return errorResponse(err);
  }
}
