// Client-side helpers. The identity header is a backup for browsers that block cookies
// inside an embedded preview. The server accepts either one.
export const STORAGE_KEY = "quorum_person";

export type Person = "maya" | "arjun";

export function savedPerson(): Person | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "maya" || v === "arjun" ? v : null;
}

export function savePerson(p: Person) {
  window.localStorage.setItem(STORAGE_KEY, p);
}

export function clearPerson() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function authHeaders(): Record<string, string> {
  const p = savedPerson();
  return p ? { "x-quorum-person": p } : {};
}

export type ApiResult<T = unknown> = T & { ok: boolean; message?: string; setup?: string; token?: string };

// Single JSON call helper. Never throws for HTTP errors: returns { ok:false, message }.
export async function callApi<T = unknown>(url: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { "content-type": "application/json", ...authHeaders(), ...(init.headers ?? {}) },
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult<T>;
    if (!res.ok && data.ok === undefined) return { ...data, ok: false, message: "The server did not respond as expected." } as ApiResult<T>;
    return data;
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection and try again." } as ApiResult<T>;
  }
}

export function postAction(name: string, body: unknown = {}) {
  return callApi(`/api/action/${name}`, { method: "POST", body: JSON.stringify(body) });
}
