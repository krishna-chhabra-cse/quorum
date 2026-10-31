import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

export class SetupError extends Error {
  constructor(
    message: string,
    public readonly problem: "missing_url" | "connection_failed",
  ) {
    super(message);
  }
}

type Globals = { __quorumPool?: Pool; __quorumDb?: ReturnType<typeof makeDb> };
const g = globalThis as unknown as Globals;

function makeDb(pool: Pool) {
  return drizzle(pool, { schema });
}

export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new SetupError("DATABASE_URL is not set. Add it to your environment and restart the app.", "missing_url");
  }
  if (!g.__quorumPool) {
    const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 15_000 });
    // Neon closes idle connections. Without a listener, that would crash the whole server process.
    pool.on("error", (err: Error) => console.error("quorum idle database connection closed:", err.message));
    g.__quorumPool = pool;
  }
  return g.__quorumPool;
}

export function getDb() {
  if (!g.__quorumDb) g.__quorumDb = makeDb(getPool());
  return g.__quorumDb;
}

export type Db = ReturnType<typeof getDb>;
