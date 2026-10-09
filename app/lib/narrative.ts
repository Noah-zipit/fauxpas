// Optional LLM narrative polish — runs on the user's own Groq key so no Muse
// quota is touched (heavy-usage rule). Falls back to the engine's template
// narrative when GROQ_API_KEY is unset or the call fails.

import { RiskReport } from "./report";

const GROQ_KEY = process.env.GROQ_API_KEY || "";

export async function maybeEnhanceNarrative(report: RiskReport): Promise<string> {
  if (!GROQ_KEY) return report.narrative;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are a sharp, dry cultural-risk analyst. Rewrite the brand-expansion brief below as 2-3 vivid sentences. Keep every number and fact. No hype, no emojis.",
          },
          { role: "user", content: report.narrative },
        ],
      }),
    });
    if (!res.ok) return report.narrative;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || report.narrative;
  } catch {
    return report.narrative;
  }
}
