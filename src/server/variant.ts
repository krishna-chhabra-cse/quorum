import type { Variant } from "./scripted";

// Pick the wording variant from the values the run read (never the live row).
// D1 = audience, D2 = pricing model. Values come from the decision versions the run read.
export function pickVariant(readValues: Record<string, string>): Variant {
  const audience = readValues.D1 ?? "";
  if (!audience || /student/i.test(audience)) return "students";
  const model = readValues.D2 ?? "";
  if (model.includes("per year")) return "enterprise_annual";
  if (model.includes("per seat")) return "enterprise_seat";
  return "enterprise";
}
