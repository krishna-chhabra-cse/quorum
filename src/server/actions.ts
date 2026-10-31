import { z } from "zod";
import type { PoolClient } from "@neondatabase/serverless";
import { approveProposal, rejectProposal, redirectProposal } from "./review";
import { requestChange, confirmChange, rejectChange } from "./decisions";
import { answerCard, confirmCard, rejectCard } from "./cards";
import { restartAgent, publishPage, redoWithLatest } from "./workspace";
import { resetDemo } from "./maintenance";
import { tickAgent, startAgent } from "./agents";
import type { Person } from "@/db/seed";

const id = z.string().min(1).max(64);
const note = z.string().trim().min(1, "Add a short note first.").max(400);

export const ACTIONS = {
  approve: z.object({ proposalId: id }),
  reject: z.object({ proposalId: id, note: z.string().trim().max(400).optional() }),
  redirect: z.object({ proposalId: id, note }),
  requestChange: z.object({
    decisionId: id,
    requestedValue: z.string().trim().min(1, "Write the new value.").max(200),
    reason: note,
  }),
  confirmChange: z.object({ changeId: id, baseVersion: z.number().int().min(1) }),
  rejectChange: z.object({ changeId: id }),
  answerCard: z.object({ cardId: id, optionId: id, note: z.string().trim().max(400).default("") }),
  confirmCard: z.object({ cardId: id }),
  rejectCard: z.object({ cardId: id }),
  startAgents: z.object({}),
  restart: z.object({ agentId: z.enum(["copy", "pricing"]) }),
  redoLatest: z.object({ proposalId: id }),
  publish: z.object({}),
  reset: z.object({}),
  tick: z.object({ agentId: z.enum(["copy", "pricing"]) }),
} as const;

export type ActionName = keyof typeof ACTIONS;
export function isAction(v: string): v is ActionName {
  return Object.prototype.hasOwnProperty.call(ACTIONS, v);
}

export type Out = { ok: boolean; status?: number; message: string; token?: string };

type Raw = { ok: boolean; status?: number; message?: string };
const toOut = (r: Raw, okMessage = ""): Out =>
  r.ok ? { ok: true, message: r.message ?? okMessage } : { ok: false, status: r.status ?? 400, message: r.message ?? "Refused." };

// Runs one named action inside the caller's transaction. Returns a plain outcome.
export async function runAction(c: PoolClient, who: Person, name: ActionName, raw: unknown): Promise<Out> {
  const body = ACTIONS[name].parse(raw) as Record<string, any>;
  switch (name) {
    case "approve":
      return toOut(await approveProposal(c, who, body.proposalId));
    case "reject":
      return toOut(await rejectProposal(c, who, body.proposalId, body.note || null));
    case "redirect":
      return toOut(await redirectProposal(c, who, body.proposalId, body.note));
    case "requestChange":
      return toOut(
        await requestChange(c, who, body.decisionId, body.requestedValue, body.reason),
        "Sent to the other person to confirm.",
      );
    case "confirmChange":
      return toOut(await confirmChange(c, who, body.changeId, body.baseVersion), "Confirmed. The decision is updated.");
    case "rejectChange":
      return toOut(await rejectChange(c, who, body.changeId), "Rejected. The decision stays as it was.");
    case "answerCard":
      return toOut(await answerCard(c, who, body.cardId, body.optionId, body.note), "Answer saved.");
    case "confirmCard": {
      const r = await confirmCard(c, who, body.cardId);
      if (r.ok) await startAgent(c, "pricing");
      return toOut(r, "Confirmed. Pricing is writing from the new decision.");
    }
    case "rejectCard":
      return toOut(await rejectCard(c, who, body.cardId), "Sent back open.");
    case "startAgents":
      await startAgent(c, "copy");
      await startAgent(c, "pricing");
      return { ok: true, message: "Both agents are writing now." };
    case "restart":
      return toOut(await restartAgent(c, who, body.agentId));
    case "redoLatest": {
      const r = await redoWithLatest(c, who, body.proposalId);
      return toOut(r, "Agent is writing from the latest decisions.");
    }
    case "publish": {
      const r = await publishPage(c, who);
      return { ...toOut(r, "Published."), token: r.ok ? r.token : undefined };
    }
    case "reset":
      return toOut(await resetDemo(c, who));
    case "tick":
      await tickAgent(c, body.agentId);
      return { ok: true, message: "" };
  }
}
