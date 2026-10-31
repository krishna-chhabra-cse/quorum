import type { PoolClient } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { one } from "./tx";
import { logEvent, logApproval } from "./events";
import { canConfirm } from "./publish-rules";
import { markStale } from "./stale";
import { PERSON_NAME, type Person } from "@/db/seed";

export const CARD_DECISION = "D2";
export const CARD_QUESTION = "Enterprise buyers usually pay per seat or by annual contract. Which should we use?";

export const CARD_OPTIONS = [
  {
    id: "per_seat",
    label: "Per seat, billed monthly",
    value: "$5 per seat per month, billed monthly",
    pro: "Teams can add or remove seats any time. Easy to start small.",
    con: "Revenue is less predictable, and teams may ask for a discount as they grow.",
  },
  {
    id: "annual_contract",
    label: "Annual contract",
    value: "$48 per seat per year, on an annual team contract",
    pro: "Predictable yearly revenue and fewer cancellations.",
    con: "Buyers must commit for a full year, which slows the first sale.",
  },
];

// The Pricing Agent holds its proposal and asks this card when a run read D1 version 2 or later
// while D2 is still at version 1.
export function shouldRaiseCard(readVersions: Record<string, number>): boolean {
  return (readVersions.D1 ?? 0) >= 2 && readVersions[CARD_DECISION] === 1;
}

export async function raiseCard(c: PoolClient, agentId: "pricing", runId: string): Promise<boolean> {
  const exists = await one<{ id: string }>(
    c,
    `SELECT id FROM decision_cards WHERE decision_id = $1 LIMIT 1`,
    [CARD_DECISION],
  );
  if (exists) return false;
  const id = randomUUID();
  await c.query(
    `INSERT INTO decision_cards (id, agent_id, run_id, decision_id, question, options_json, status)
     VALUES ($1,$2,$3,$4,$5,$6,'open')`,
    [id, agentId, runId, CARD_DECISION, CARD_QUESTION, JSON.stringify(CARD_OPTIONS)],
  );
  await logEvent(c, agentId, "card_raised", "Pricing Agent asked a Decision Card about pricing model (D2).", "card " + id);
  return true;
}

type Result = { ok: true } | { ok: false; status: number; message: string };

// Answer: any human may answer. The answerer cannot confirm the answer.
export async function answerCard(c: PoolClient, who: Person, cardId: string, optionId: string, note: string): Promise<Result> {
  const k = await one<any>(c, `SELECT * FROM decision_cards WHERE id = $1 FOR UPDATE`, [cardId]);
  if (!k) return { ok: false, status: 404, message: "That card does not exist." };
  if (k.status === "confirmed") return { ok: false, status: 409, message: "This card is already settled." };
  const option = CARD_OPTIONS.find((o) => o.id === optionId);
  if (!option) return { ok: false, status: 400, message: "Pick one of the two options." };
  await c.query(
    `UPDATE decision_cards SET status='answered', answer_option=$2, answer_note=$3, answered_by=$4 WHERE id=$1`,
    [cardId, optionId, note, who],
  );
  await logApproval(c, { actor: who, action: "answer_card", targetType: "card", targetId: cardId, note, versionCheck: "n/a" });
  await logEvent(c, who, "card_answered", PERSON_NAME[who] + ' answered the pricing question: "' + option.label + '".', "card " + cardId);
  return { ok: true };
}

// Confirm: the other human must confirm. Confirming creates D2 version 2 with the chosen pricing model.
export async function confirmCard(
  c: PoolClient,
  who: Person,
  cardId: string,
): Promise<{ ok: true; version: number } | { ok: false; status: number; message: string }> {
  const k = await one<any>(c, `SELECT * FROM decision_cards WHERE id = $1 FOR UPDATE`, [cardId]);
  if (!k) return { ok: false, status: 404, message: "That card does not exist." };
  if (k.status !== "answered") return { ok: false, status: 409, message: "Someone needs to answer this card first." };
  if (!canConfirm(who, k.answered_by)) {
    await logApproval(c, {
      actor: who,
      action: "confirm_card",
      targetType: "card",
      targetId: cardId,
      versionCheck: "n/a",
      detail: "Refused: the answerer cannot confirm.",
    });
    return { ok: false, status: 403, message: "You answered this card, so the other person must confirm it." };
  }
  const option = CARD_OPTIONS.find((o) => o.id === k.answer_option);
  if (!option) return { ok: false, status: 409, message: "The saved answer is not valid. Send the card back open." };

  const d = await one<any>(c, `SELECT * FROM decisions WHERE id = $1 FOR UPDATE`, [CARD_DECISION]);
  const next = d.current_version + 1;
  await c.query(`UPDATE decision_cards SET status='confirmed', confirmed_by=$2, resolved_at=now() WHERE id=$1`, [cardId, who]);
  await c.query(
    `INSERT INTO decision_versions (id, decision_id, version, value, requested_by, confirmed_by, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(), CARD_DECISION, next, option.value, k.answered_by, who, k.answer_note || "Decision Card"],
  );
  await c.query(`UPDATE decisions SET current_version=$2, current_value=$3 WHERE id=$1`, [CARD_DECISION, next, option.value]);
  await c.query(`UPDATE agents SET status='idle', step_label='Decision settled. Starting a new run.', updated_at=now() WHERE id=$1`, [k.agent_id]);
  await logApproval(c, {
    actor: who,
    action: "confirm_card",
    targetType: "card",
    targetId: cardId,
    versionCheck: "passed",
    detail: "Created " + CARD_DECISION + " version " + next + ".",
  });
  await markStale(c, CARD_DECISION, next);
  await logEvent(c, who, "decision_changed", PERSON_NAME[who] + " confirmed pricing model (D2) is now " + option.label + " (version " + next + ").", "decision " + CARD_DECISION + " v" + next);
  return { ok: true, version: next };
}

// Reject: reopen the card so a human can answer again. Nothing changes in D2.
export async function rejectCard(c: PoolClient, who: Person, cardId: string): Promise<Result> {
  const k = await one<any>(c, `SELECT * FROM decision_cards WHERE id = $1 FOR UPDATE`, [cardId]);
  if (!k) return { ok: false, status: 404, message: "That card does not exist." };
  if (k.status !== "answered") return { ok: false, status: 409, message: "Only an answered card can be sent back." };
  await c.query(
    `UPDATE decision_cards SET status='open', answer_option=NULL, answer_note=NULL, answered_by=NULL WHERE id=$1`,
    [cardId],
  );
  await logApproval(c, { actor: who, action: "reject_card", targetType: "card", targetId: cardId, versionCheck: "n/a" });
  await logEvent(c, who, "card_reopened", PERSON_NAME[who] + " sent the pricing question back open.", "card " + cardId);
  return { ok: true };
}
