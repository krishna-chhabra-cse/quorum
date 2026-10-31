import type { PoolClient } from "@neondatabase/serverless";
import { getPool, SetupError } from "./index";
import { SEED_DECISIONS, SEED_SECTIONS, SEED_DEPENDENCIES, SEED_AGENTS, SEED_EVENTS, EVENT_SEQ_START } from "./seed";

// Idempotent schema creation. Safe to run on every cold start.
const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS decisions (
    id text PRIMARY KEY, title text NOT NULL, question text NOT NULL, owner text NOT NULL,
    current_version integer NOT NULL, current_value text NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS decision_versions (
    id text PRIMARY KEY, decision_id text NOT NULL, version integer NOT NULL, value text NOT NULL,
    requested_by text, confirmed_by text, reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dv_decision_version_uq UNIQUE (decision_id, version))`,
  `CREATE TABLE IF NOT EXISTS sections (
    id text PRIMARY KEY, title text NOT NULL, agent_id text, sort_order integer NOT NULL,
    approved_text text NOT NULL, approved_proposal_id text, status text NOT NULL, stale_reason text)`,
  `CREATE TABLE IF NOT EXISTS section_dependencies (
    id text PRIMARY KEY, section_id text NOT NULL, decision_id text NOT NULL,
    CONSTRAINT sd_uq UNIQUE (section_id, decision_id))`,
  `CREATE TABLE IF NOT EXISTS agents (
    id text PRIMARY KEY, name text NOT NULL, section_ids text NOT NULL, status text NOT NULL,
    step integer NOT NULL DEFAULT 0, step_label text NOT NULL DEFAULT 'Not started',
    run_id text, submit_after_sec integer NOT NULL, context_packet jsonb,
    memory_reset boolean NOT NULL DEFAULT false,
    clock_ms integer NOT NULL DEFAULT 0, last_tick_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS runs (
    id text PRIMARY KEY, agent_id text NOT NULL, attempt integer NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(), read_versions jsonb NOT NULL, status text NOT NULL,
    CONSTRAINT runs_agent_attempt_uq UNIQUE (agent_id, attempt))`,
  `CREATE TABLE IF NOT EXISTS proposals (
    id text PRIMARY KEY, run_id text NOT NULL, agent_id text NOT NULL, section_id text NOT NULL,
    current_text text NOT NULL, proposed_text text NOT NULL, reason text NOT NULL,
    versions_used jsonb NOT NULL, mode text NOT NULL, status text NOT NULL,
    submitted_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, stale_reason text, human_note text,
    CONSTRAINT proposals_run_section_uq UNIQUE (run_id, section_id))`,
  `CREATE TABLE IF NOT EXISTS decision_cards (
    id text PRIMARY KEY, agent_id text NOT NULL, run_id text NOT NULL, decision_id text NOT NULL,
    question text NOT NULL, options_json jsonb NOT NULL, status text NOT NULL,
    answer_option text, answer_note text, answered_by text, confirmed_by text,
    created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
    CONSTRAINT cards_run_decision_uq UNIQUE (run_id, decision_id))`,
  `CREATE TABLE IF NOT EXISTS change_requests (
    id text PRIMARY KEY, decision_id text NOT NULL, requested_value text NOT NULL,
    base_version integer NOT NULL, requested_by text NOT NULL, reason text NOT NULL,
    status text NOT NULL, confirmed_by text, result_version integer,
    created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS approvals (
    id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL, target_type text NOT NULL,
    target_id text NOT NULL, note text, version_check text NOT NULL, detail text,
    created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS events (
    id text PRIMARY KEY, seq integer NOT NULL, actor text NOT NULL, kind text NOT NULL,
    plain text NOT NULL, technical text, created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT events_seq_uq UNIQUE (seq))`,
  `CREATE TABLE IF NOT EXISTS presence (
    person text PRIMARY KEY, last_seen timestamptz NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS published_pages (
    id text PRIMARY KEY, token text NOT NULL, snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT published_token_uq UNIQUE (token))`,
  `CREATE TABLE IF NOT EXISTS meta (
    key text PRIMARY KEY, value text NOT NULL)`,
];

// Idempotent data fixes for databases seeded before the Footer had an owner.
const MIGRATIONS: string[] = [
  `UPDATE sections SET agent_id = 'copy' WHERE id = 'footer' AND agent_id IS NULL`,
  `UPDATE agents SET section_ids = 'hero,features,footer' WHERE id = 'copy' AND section_ids = 'hero,features'`,
];

const LOCK_KEY = 728311; // arbitrary advisory lock id for Quorum setup
const SETUP_VERSION = "2"; // raise this when DDL or MIGRATIONS change

let ready: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  if (!ready) {
    ready = runSetup().catch((err) => {
      ready = null; // allow retry on next request
      throw err;
    });
  }
  return ready;
}

async function runSetup() {
  const pool = getPool();
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    throw new SetupError(
      `Could not connect to the database: ${describeDbError(err)}. Check DATABASE_URL and that the database is reachable.`,
      "connection_failed",
    );
  }
  client.on("error", (err: Error) => console.error("quorum setup connection dropped:", err.message));
  try {
    // Already set up, which is the normal case on every cold start: no lock is needed at all.
    const current = await client.query("SELECT value FROM meta WHERE key = 'setup_version'").catch(() => null);
    if (current?.rows[0]?.value === SETUP_VERSION) return;

    // The transaction lock releases itself on commit, rollback, or a dropped connection,
    // and the timeout means one stuck instance can never hang every other request.
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '20s'");
      await client.query("SELECT pg_advisory_xact_lock($1)", [LOCK_KEY]);
      for (const stmt of DDL) await client.query(stmt);
      for (const stmt of MIGRATIONS) await client.query(stmt);
      const seeded = await client.query("SELECT value FROM meta WHERE key = 'seeded'");
      if (seeded.rowCount === 0) {
        await insertSeed(client);
        await client.query("INSERT INTO meta (key, value) VALUES ('seeded', 'true')");
      }
      await client.query(
        `INSERT INTO meta (key, value) VALUES ('setup_version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [SETUP_VERSION],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    }
  } finally {
    client.removeAllListeners("error");
    client.release();
  }
}

// Shows the error code and message only. Connection strings are never included,
// and the message is scrubbed of anything that looks like a URL or password.
export function describeDbError(err: unknown): string {
  const e = err as { code?: string; message?: string; name?: string };
  const code = e?.code ?? e?.name ?? "UNKNOWN";
  const raw = typeof e?.message === "string" ? e.message : "no message";
  const safe = raw.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s'"]*/gi, "[url]").replace(/password[^\s,;]*/gi, "password=[hidden]");
  return `${code}: ${safe.slice(0, 200)}`;
}

// Inserts seed rows. Caller holds the advisory lock and the transaction.
export async function insertSeed(client: PoolClient) {
  for (const d of SEED_DECISIONS) {
    await client.query(
      `INSERT INTO decisions (id, title, question, owner, current_version, current_value)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [d.id, d.title, d.question, d.owner, 1, d.value],
    );
    await client.query(
      `INSERT INTO decision_versions (id, decision_id, version, value, requested_by, confirmed_by, reason)
       VALUES ($1,$2,1,$3,'seed','seed','Starting value') ON CONFLICT (id) DO NOTHING`,
      [`${d.id}-v1`, d.id, d.value],
    );
  }
  for (const s of SEED_SECTIONS) {
    await client.query(
      `INSERT INTO sections (id, title, agent_id, sort_order, approved_text, status)
       VALUES ($1,$2,$3,$4,$5,'current') ON CONFLICT (id) DO NOTHING`,
      [s.id, s.title, s.agentId, s.order, s.text],
    );
  }
  for (const dep of SEED_DEPENDENCIES) {
    await client.query(
      `INSERT INTO section_dependencies (id, section_id, decision_id) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [`${dep.sectionId}-${dep.decisionId}`, dep.sectionId, dep.decisionId],
    );
  }
  for (const a of SEED_AGENTS) {
    await client.query(
      `INSERT INTO agents (id, name, section_ids, status, step, step_label, submit_after_sec)
       VALUES ($1,$2,$3,'idle',0,'Not started',$4) ON CONFLICT (id) DO NOTHING`,
      [a.id, a.name, a.sectionIds, a.submitAfterSec],
    );
  }
  await client.query(
    `INSERT INTO meta (key, value) VALUES ('event_seq', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(EVENT_SEQ_START)],
  );
  for (const e of SEED_EVENTS) {
    await client.query(
      `INSERT INTO events (id, seq, actor, kind, plain, technical) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [e.id, e.seq, e.actor, e.kind, e.plain, e.technical ?? null],
    );
  }
}
