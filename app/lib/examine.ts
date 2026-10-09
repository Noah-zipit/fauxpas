// The Analyst's cross-examination — after a dossier is filed, the user can
// question it. The agent answers from the dossier, and when the question
// needs fresh data it calls the cultural_scan tool, which runs real Scout +
// Analyst scans against the live Qloo graph.

import { quickScan } from "./agents";
import { chatWithTools, llmProvider } from "./llm";
import { MARKETS } from "./mock";
import type { RiskReport } from "./report";

export interface ExamTurn {
  q: string;
  a: string;
  tools: number;
}

const SCAN_TOOL = {
  type: "function",
  function: {
    name: "cultural_scan",
    description:
      "Run a full cultural-fit scan for any brand in any market against the live taste graph. Returns score, verdict, widest gaps and third rails. Use it for comparisons or to verify claims with fresh data.",
    parameters: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Brand name, e.g. Nike, Heineken" },
        marketId: {
          type: "string",
          description: "Market id, one of: tokyo, riyadh, berlin, mumbai, sao-paulo, new-york, london, dubai",
        },
      },
      required: ["brand", "marketId"],
    },
  },
};

function dossierDigest(r: RiskReport): string {
  return [
    `Brand: ${r.brandName} (${r.brandCategory}). Target: ${r.targetMarket}.`,
    `Score: ${r.score}/100 — verdict ${r.verdict}.`,
    `Widest gaps: ${r.gaps.slice(0, 3).map((g) => `${g.label} (brand ${g.brand} vs market ${g.market})`).join("; ")}.`,
    r.tabooHits.length ? `Third rails: ${r.tabooHits.map((t) => `${t.label} (${t.sensitivity}/100)`).join(", ")}.` : "No third rails.",
    `Moves: ${r.moves.join(" ")}`,
    r.objections.length ? `Red team dissent: ${r.objections.join(" ")}` : "",
    `Data: brand ${r.brandLive ? "live graph" : "curated"}, market ${r.marketLive ? "live signal" : "curated"}.`,
  ].join("\n");
}

/** Extractive fallback when no LLM is configured: best matching dossier sentences. */
function fallbackAnswer(r: RiskReport, question: string): string {
  const hay = [
    r.narrative,
    ...r.gaps.slice(0, 4).map(
      (g) =>
        `On ${g.label}: the brand pushes ${g.brand}, the market sits at ${g.market} — ` +
        (g.direction === "clash"
          ? `the brand pushes ${Math.abs(g.gap)} points harder than the market wants.`
          : `the market wants ${Math.abs(g.gap)} points more than the brand delivers.`)
    ),
    ...r.tabooHits.map((t) => `Third rail: ${t.label} — sensitivity ${t.sensitivity}/100. ${t.detail}`),
    ...r.moves,
    ...r.objections,
  ];
  const qwords = question.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  const scored = hay
    .map((s) => ({ s, n: qwords.filter((w) => s.toLowerCase().includes(w)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2);
  if (!scored.length)
    return (
      "The dossier doesn't directly cover that. Try asking about a specific domain (dining, nightlife, tradition…), " +
      "a third rail, or the verdict itself."
    );
  return scored.map((x) => x.s).join(" ");
}

export async function examine(
  report: RiskReport,
  question: string,
  history: ExamTurn[]
): Promise<ExamTurn> {
  const provider = llmProvider();
  if (!provider) return { q: question, a: fallbackAnswer(report, question), tools: 0 };

  const marketList = MARKETS.map((m) => `${m.id} (${m.name})`).join(", ");
  const prior = history
    .slice(-4)
    .map((t) => `Q: ${t.q}\nA: ${t.a}`)
    .join("\n");

  const { answer, toolRuns } = await chatWithTools({
    system:
      "You are the Analyst, the agent who compiled the cultural-fit dossier below. Answer the user's follow-up questions briefly (2-4 sentences), with numbers, in a dry editorial voice. " +
      `The dossier under examination:\n${dossierDigest(report)}\n` +
      `Markets you can scan: ${marketList}. ` +
      "When the question asks about another brand, another market, or a comparison, call cultural_scan for fresh live data instead of guessing. Never invent scores.",
    user: (prior ? `Earlier in this examination:\n${prior}\n\n` : "") + `Question: ${question}`,
    tools: [SCAN_TOOL],
    maxIters: 3,
    temperature: 0.6,
    maxTokens: 450,
    onTool: async (name, args) => {
      if (name !== "cultural_scan") return { error: "unknown tool" };
      const marketId = String(args.marketId || "").toLowerCase();
      if (!MARKETS.some((m) => m.id === marketId)) return { error: `unknown market ${args.marketId}` };
      if (!args.brand || typeof args.brand !== "string") return { error: "brand required" };
      try {
        return await quickScan(args.brand, marketId);
      } catch (e: any) {
        return { error: String(e?.message || e) };
      }
    },
  });

  return {
    q: question,
    a: answer || fallbackAnswer(report, question),
    tools: toolRuns,
  };
}
