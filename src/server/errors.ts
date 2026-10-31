// Errors that map to a clear HTTP response. Anything else becomes a generic 500.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Returned (not thrown) from transactions that must still commit an audit row.
export type Outcome = { ok: true } | { ok: false; status: number; message: string };
export const fail = (status: number, message: string): Outcome => ({ ok: false, status, message });
