import { ensureDatabase } from "@/db/setup";
import { errorResponse, requirePerson } from "@/server/api";
import { exportJson } from "@/server/maintenance";
import { withTx } from "@/server/tx";

export const dynamic = "force-dynamic";

// JSON download of the audit trail: decisions, versions, sections, events, and approval checks.
export async function GET(req: Request) {
  try {
    requirePerson(req);
    await ensureDatabase();
    const data = await withTx((c) => exportJson(c));
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="quorum-slate-log.json"',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
