import type { PoolClient } from "@neondatabase/serverless";
import { getPool } from "@/db";

// Runs fn inside a real transaction. Commits when fn returns, rolls back when it throws.
export async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
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
