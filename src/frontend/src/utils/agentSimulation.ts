type AgentMode = "caffeine" | "normal" | "deep";

export function getTaskDelay(mode: AgentMode) {
  if (mode === "caffeine") return { total: 1200, final: 200 };
  if (mode === "deep") return { total: 4000, final: 800 };
  return { total: 2000, final: 400 };
}
