import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db/setup";
import { loadView } from "@/server/state";
import { errorResponse, requirePerson } from "@/server/api";
import { heartbeat } from "@/server/maintenance";
import { tickAgent } from "@/server/agents";
import { withTx } from "@/server/tx";

export const dynamic = "force-dynamic";

// Read the full workspace for the signed-in person. Also records a presence heartbeat
// and advances any running agent, so runs progress while the page is open.
export async function GET(req: Request) {
  try {
    const who = requirePerson(req);
    await ensureDatabase();
    // Writes commit first, so reading the view never holds a row lock.
    await withTx(async (c) => {
      await heartbeat(c, who);
      await tickAgent(c, "copy");
      await tickAgent(c, "pricing");
    });
    const view = await withTx((c) => loadView(c, who));
    return NextResponse.json({ ok: true, view });
  } catch (err) {
    return errorResponse(err);
  }
}
