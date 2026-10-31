import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase } from "@/db/setup";
import { errorResponse, readJson } from "@/server/api";
import { cookieFor, isPerson } from "@/server/identity";
import { HttpError } from "@/server/errors";

export const dynamic = "force-dynamic";

const JoinBody = z.object({ person: z.string() });

// Sets who you are. Both a cookie and a body value are returned so the client can keep
// its own backup if the browser blocks cookies inside an embedded preview.
export async function POST(req: Request) {
  try {
    const { person } = JoinBody.parse(await readJson(req));
    if (!isPerson(person)) throw new HttpError(400, "Pick Maya or Arjun.");
    await ensureDatabase();
    const res = NextResponse.json({ ok: true, person });
    res.headers.set("Set-Cookie", cookieFor(person, req));
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
