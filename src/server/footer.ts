// Footer call to action wording per brand tone (D3). Used when live AI is unavailable.
// An unknown tone falls back to the friendly wording so the section can always be written.
const FOOTER_BY_TONE: Record<string, string> = {
  "Friendly and clear": "Start taking better notes today. Try Slate free for 14 days.",
  "Formal and precise": "Begin your 14-day trial of Slate and keep every meeting record in order.",
  "Playful and bold": "Stop replaying lectures. Try Slate free for 14 days and see the difference.",
};

export function footerText(tone: string): string {
  return FOOTER_BY_TONE[tone] ?? FOOTER_BY_TONE["Friendly and clear"];
}
