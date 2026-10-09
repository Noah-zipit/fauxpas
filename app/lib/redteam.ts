// Red Team agent — the adversarial voice in the pipeline. It takes the
// analyst's finished report and argues, from the data, why the launch will
// fail. No LLM required: every objection is derived from real gaps, taboos
// and scores. An optional Groq pass can sharpen the wording when a key exists.

import { RiskReport } from "./report";
import { chat } from "./llm";

function deterministicObjections(r: RiskReport): string[] {
  const out: string[] = [];

  // The nuclear taboos first — these aren't marketing problems.
  for (const h of r.tabooHits.filter((t) => t.sensitivity >= 80).slice(0, 2)) {
    out.push(
      `The ${h.label.toLowerCase()} problem is not a positioning challenge — it is a product ban. ` +
        `Sensitivity scores ${h.sensitivity}/100 in ${r.targetMarket}, which means the core ritual your brand sells ` +
        `is illegal or socially radioactive there. You are not localizing a campaign; you would have to invent a different company.`
    );
  }

  // The biggest clash — where the brand's identity fights the market.
  const clash = r.gaps.find((g) => g.direction === "clash" && Math.abs(g.gap) >= 22);
  if (clash && out.length < 3) {
    out.push(
      `Your brand pushes ${clash.label.toLowerCase()} at ${clash.brand} and this market sits at ${clash.market} — ` +
        `a ${Math.abs(clash.gap)}-point collision on the exact axis your identity is built on. ` +
        `Every euro of media spend amplifies the mismatch. The louder the launch, the faster the backlash.`
    );
  }

  // The miss — where the market wants something you don't have.
  const miss = r.gaps.find((g) => g.direction === "miss" && Math.abs(g.gap) >= 25);
  if (miss && out.length < 3) {
    out.push(
      `${r.targetMarket} wants ${Math.abs(miss.gap)} points more ${miss.label.toLowerCase()} than you deliver ` +
        `(you: ${miss.brand}, them: ${miss.market}). You would arrive as a guest who didn't learn the language — ` +
        `polite, irrelevant, and forgotten within a quarter.`
    );
  }

  // The complacency case for high scores.
  if (r.verdict === "LOVE" && out.length < 3) {
    out.push(
      `A ${r.score}/100 fit score is precisely when launches die of arrogance. High cultural fit tempts teams to skip ` +
        `localization entirely — and ${r.targetMarket} punishes imported creative faster than it rewards good intentions. ` +
        `The data says "go"; the data does not say "go unchanged."`
    );
  }

  // The floor case for terrible scores.
  if (r.verdict === "CANCEL" && out.length === 0) {
    out.push(
      `At ${r.score}/100, this is not a launch plan — it is a boycott waiting for a date. ` +
        `The honest move is to walk away from ${r.targetMarket} until the product itself changes, not the messaging.`
    );
  }

  return out.slice(0, 3);
}

export async function buildObjections(r: RiskReport): Promise<{ objections: string[]; sharpened: boolean }> {
  const base = deterministicObjections(r);
  if (base.length === 0) return { objections: base, sharpened: false };
  const sharpened = await chat({
    system:
      "You are a ruthless red-team analyst. Sharpen each objection below into one vivid paragraph. Keep every number and fact. No hype, no emojis, no softening.",
    user: base.map((b, i) => `${i + 1}. ${b}`).join("\n"),
    temperature: 0.8,
    maxTokens: 400,
  });
  if (!sharpened) return { objections: base, sharpened: false };
  const parts = sharpened
    .split(/\n(?=\d+\.\s)/)
    .map((p: string) => p.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  return parts.length > 0 ? { objections: parts.slice(0, 3), sharpened: true } : { objections: base, sharpened: false };
}
