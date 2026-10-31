import { PEOPLE, type Person } from "@/db/seed";

export const COOKIE_NAME = "quorum_person";
export const HEADER_NAME = "x-quorum-person";

export function isPerson(v: unknown): v is Person {
  return typeof v === "string" && (PEOPLE as readonly string[]).includes(v);
}

// Identity comes from the localStorage backup header first, then the cookie.
// Either alone is enough, so a blocked cookie in an iframe does not break the app.
export function personFromRequest(req: Request): Person | null {
  const header = req.headers.get(HEADER_NAME);
  if (isPerson(header)) return header;
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([a-z]+)`));
  const fromCookie = m?.[1];
  return isPerson(fromCookie) ? fromCookie : null;
}

// SameSite=None + Secure for HTTPS (works inside an embedded iframe preview).
// Plain HTTP local development cannot use Secure, so fall back to Lax there.
export function cookieFor(person: Person, req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const secure = proto === "https";
  const parts = [
    `${COOKIE_NAME}=${person}`,
    "Path=/",
    "Max-Age=2592000",
    "HttpOnly",
    secure ? "SameSite=None" : "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
