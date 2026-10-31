# Quorum

A shared workspace where two people and two AI agents build one product page together. Quorum's job is to catch agent work that a human decision has made outdated.

The demo builds the launch page for **Slate**, an AI meeting notes app for college students.

## How it works

- **Decisions** (D1 target customer, D2 pricing model, D3 brand tone) are versioned. Each has one owner.
- **Agents** (Copy Agent: Hero and Features; Pricing Agent: Pricing) record the decision versions they read when a run starts. Their proposals copy those versions. They never read the live values at submission time.
- When a decision changes, only sections that depend on it are marked **Stale**, with a plain-English reason. Pending proposals written against the old version are marked stale too and cannot be approved.
- A person decides what happens next: approve a current proposal, send the agent back with a note, reject and keep the old text, or settle a Decision Card.
- Decision changes need a second person to confirm. The person who asked cannot confirm their own change.
- Publishing is blocked while anything is stale, pending, or unresolved. A published page is a frozen snapshot with a read-only link.

## Pages

- `/join`: pick Maya or Arjun. Your choice is remembered on this device.
- `/workspace`: the shared workspace (page sections, decisions, waiting items, agents, history).
- `/published/[token]`: read-only published snapshot.
- `/api/export`: plain-text export of the page, decisions, and history.

## Setup

1. Set `DATABASE_URL` to a Postgres connection string (Neon works).
2. Optional: set `QUORUM_AI_ENDPOINT` and `QUORUM_AI_KEY` to use live AI text. Without them, agents use the prewritten text in `src/server/scripted.ts`, and the workspace says so in the history.
3. Run `bun run db:push` to create tables, or let the app create them on first request. Setup is idempotent and seeds the demo once.
4. Run `bun run dev` (or `bun run build && bun run start`).

## Checks

- `bun run typecheck`
- `bun run build`

## Layout

- `src/db/`: schema, idempotent setup and seed, Neon connection.
- `src/server/`: rules and transactions (decisions, stale marking, review, cards, agents, publish, reset, export).
- `src/app/api/`: Route Handlers. One dispatcher route validates every action with zod.
- `src/app/workspace/`: the workspace UI, split into small panels.
