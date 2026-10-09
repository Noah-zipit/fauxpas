// Optional LLM narrative polish — NVIDIA NIM first, Groq fallback (both on
// the user's own keys so no Muse quota is touched). Falls back to the
// engine's template narrative when no provider is configured or the call fails.

import { RiskReport } from "./report";
import { chat } from "./llm";

export async function maybeEnhanceNarrative(report: RiskReport): Promise<string> {
  const polished = await chat({
    system:
      "You are a sharp, dry cultural-risk analyst. Rewrite the brand-expansion brief below as 2-3 vivid sentences. Keep every number and fact. No hype, no emojis.",
    user: report.narrative,
    temperature: 0.7,
    maxTokens: 220,
  });
  return polished || report.narrative;
}
