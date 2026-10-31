import { Bot, Info } from "lucide-react";

const PEOPLE: Record<string, { initial: string; cls: string }> = {
  maya: { initial: "M", cls: "bg-maya-soft text-maya" },
  arjun: { initial: "A", cls: "bg-arjun-soft text-arjun" },
};

// One small marker per actor, so people, agents, and the system are easy to tell apart.
export function Avatar({ actor, size = "md" }: { actor: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  const person = PEOPLE[actor];
  if (person) {
    return (
      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-bold ${box} ${person.cls}`}>
        {person.initial}
      </span>
    );
  }
  const agent = actor === "copy" || actor === "pricing";
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full ${box} ${agent ? "bg-agent-soft text-agent" : "bg-muted text-muted-foreground"}`}>
      {agent ? <Bot size={size === "sm" ? 15 : 18} /> : <Info size={size === "sm" ? 15 : 18} />}
    </span>
  );
}
