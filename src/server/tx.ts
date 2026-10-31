import type { PoolClient } from "@neondatabase/serverless";
import { getPool } from "@/db";

const ignoreDrop = (err: Error) => console.error("quorum database connection dropped:", err.message);

// Checks out a connection that has really started a transaction. A pooled connection can be
// dead by the time it is used, and nothing has run yet at this point, so one retry is safe.
async function begin(retries = 1): Promise<PoolClient> {
  const client = await getPool().connect();
  client.on("error", ignoreDrop);
  try {
    // A request waiting on a row lock fails with a clear error instead of hanging the page.
    await client.query("BEGIN; SET LOCAL lock_timeout = '8s'");
    return client;
  } catch (err) {
    client.off("error", ignoreDrop);
    client.release(true);
    if (retries > 0) return begin(retries - 1);
    throw err;
  }
}

// Runs fn inside a real transaction. Commits when fn returns, rolls back when it throws.
export async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await begin();
  let broken = false;
  try {
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {
      broken = true;
    });
    throw err;
  } finally {
    client.off("error", ignoreDrop);
    client.release(broken);
  }
}

// Convenience for typed row reads.
export async function rows<T>(c: PoolClient, text: string, values: unknown[] = []): Promise<T[]> {
  const r = await c.query(text, values);
  return r.rows as T[];
}

export async function one<T>(c: PoolClient, text: string, values: unknown[] = []): Promise<T | null> {
  const r = await rows<T>(c, text, values);
  return r[0] ?? null;
}
