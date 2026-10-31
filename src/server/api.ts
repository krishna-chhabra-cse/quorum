import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./errors";
import { SetupError } from "@/db/index";
import { personFromRequest } from "./identity";
import type { Person } from "@/db/seed";

// Maps any thrown error to a JSON response. Setup errors get a plain message the UI can show.
export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ ok: false, message: err.message }, { status: err.status });
  if (err instanceof ZodError) {
    const first = err.issues[0]?.message ?? "That input is not valid.";
    return NextResponse.json({ ok: false, message: first }, { status: 400 });
  }
  if (err instanceof SetupError) {
    return NextResponse.json({ ok: false, message: err.message, setup: err.problem }, { status: 503 });
  }
  console.error("quorum api error", (err as Error)?.name);
  return NextResponse.json({ ok: false, message: "Something went wrong on the server. Try again." }, { status: 500 });
}

// Requires a known person. Returns 401 with a clear message instead of a crash.
export function requirePerson(req: Request): Person {
  const who = personFromRequest(req);
  if (!who) throw new HttpError(401, "Pick who you are on the join page first.");
  return who;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
