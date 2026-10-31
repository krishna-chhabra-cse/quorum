// Single provider module for all AI text. Falls back to scripted text on no key, error, or timeout.
import { SCRIPTED, type SectionKind, type Variant } from "./scripted";
import { footerText } from "./footer";

export type Mode = "live" | "scripted";

export type AiResult = {
  mode: Mode;
  text: string;
  fallbackReason?: string; // set when live was attempted but scripted was used
};

const TIMEOUT_MS = 15_000;

const AUDIENCE: Record<Variant, string> = {
  students: "college students, monthly plan",
  enterprise: "enterprise IT teams, pricing not yet chosen",
  enterprise_seat: "enterprise IT teams, per seat monthly billing",
  enterprise_annual: "enterprise IT teams, annual contract",
};

// The variant and tone are the values the agent's run read, never the live row.
export async function draftSection(kind: SectionKind, variant: Variant, tone: string): Promise<AiResult> {
  const endpoint = process.env.QUORUM_AI_ENDPOINT;
  const key = process.env.QUORUM_AI_KEY;
  const fallback = kind === "footer" ? footerText(tone) : SCRIPTED[kind][variant];
  if (!key || !endpoint) {
    return { mode: "scripted", text: fallback, fallbackReason: "no AI key configured" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        task: `Write the ${kind} section of a launch page for Slate, an AI meeting notes app. Audience: ${AUDIENCE[variant]}. Tone: ${tone}. Return only the section text, two sentences max.`,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AI responded with status ${res.status}`);
    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) throw new Error("AI returned empty text");
    return { mode: "live", text };
  } catch (err) {
    const reason = (err as Error).name === "AbortError" ? "AI timed out after 15 seconds" : "AI request failed";
    return { mode: "scripted", text: fallback, fallbackReason: reason };
  } finally {
    clearTimeout(timer);
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.QUORUM_AI_ENDPOINT && process.env.QUORUM_AI_KEY);
}
