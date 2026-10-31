// Prewritten text used when live AI is unavailable. The variant matches the decisions
// the run read, so a decision change switches wording without a live model.
export type Variant = "students" | "enterprise" | "enterprise_seat" | "enterprise_annual";
export type SectionKind = "hero" | "features" | "pricing" | "footer";

const STUDENT_HERO =
  "Never lose a detail from a lecture again. Slate turns your classes and study groups into clear notes you can actually use before the exam.";
const STUDENT_FEATURES =
  "Live transcripts for every lecture. Action items pulled out for you. Share notes with your study group in one tap.";
const ENTERPRISE_HERO =
  "Turn every IT planning meeting into clear, shared decisions. Slate keeps notes, owners, and follow-ups in one place for your whole team.";
const ENTERPRISE_FEATURES =
  "Searchable transcripts for every meeting. Action items assigned to owners. Admin controls for security and data retention.";

// The footer varies by brand tone instead (see footer.ts).
export const SCRIPTED: Record<Exclude<SectionKind, "footer">, Record<Variant, string>> = {
  hero: {
    students: STUDENT_HERO,
    enterprise: ENTERPRISE_HERO,
    enterprise_seat: ENTERPRISE_HERO,
    enterprise_annual: ENTERPRISE_HERO,
  },
  features: {
    students: STUDENT_FEATURES,
    enterprise: ENTERPRISE_FEATURES,
    enterprise_seat: ENTERPRISE_FEATURES,
    enterprise_annual: ENTERPRISE_FEATURES,
  },
  pricing: {
    students: "$5 per month for one individual plan with everything in Slate. Cancel anytime.",
    enterprise: "Per-seat pricing for your team, with volume discounts and a yearly contract option. Talk to us for a custom quote.",
    enterprise_seat: "$5 per seat per month for your team, billed monthly. Add or remove seats any time.",
    enterprise_annual: "$48 per seat per year on an annual team contract. One invoice, with everything in Slate included.",
  },
};
