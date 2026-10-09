import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/agents";
import { chat, llmProvider } from "@/lib/llm";

// Body: { brandA: string, brandB: string, targetMarket: string }
// Runs the full pipeline for both brands, then a judge declares the winner.
export async function POST(req: NextRequest) {
  try {
    const { brandA, brandB, targetMarket } = await req.json();
    for (const [k, v] of [["brandA", brandA], ["brandB", brandB], ["targetMarket", targetMarket]]) {
      if (!v || typeof v !== "string" || !v.trim())
        return NextResponse.json({ error: `Missing ${k}.` }, { status: 400 });
    }

    const [a, b] = await Promise.all([
      runPipeline(brandA.trim(), "", targetMarket),
      runPipeline(brandB.trim(), "", targetMarket),
    ]);

    const winner = a.score === b.score ? null : a.score > b.score ? "A" : "B";
    const judgeNote =
      (await chat({
        system:
          "You are the judge of a brand-vs-brand cultural-fit bout. Below are two dossiers for the same market. " +
          "Declare the winner and give 2-3 sentences of reasoning with numbers. Dry, editorial, no hype, no emojis.",
        user:
          `CONTENDER A: ${a.brandName} — ${a.score}/100 ${a.verdict}. ` +
          `Widest gaps: ${a.gaps.slice(0, 2).map((g) => `${g.label} ${g.brand}v${g.market}`).join(", ")}. ` +
          `Third rails: ${a.tabooHits.map((t) => t.label).join(", ") || "none"}.\n` +
          `CONTENDER B: ${b.brandName} — ${b.score}/100 ${b.verdict}. ` +
          `Widest gaps: ${b.gaps.slice(0, 2).map((g) => `${g.label} ${g.brand}v${g.market}`).join(", ")}. ` +
          `Third rails: ${b.tabooHits.map((t) => t.label).join(", ") || "none"}.`,
        temperature: 0.6,
        maxTokens: 220,
      })) ||
      (winner === null
        ? `${a.brandName} and ${b.brandName} both score ${a.score}/100 in ${a.targetMarket} — the judges call it a draw. Neither brand has a decisive cultural edge here.`
        : `Winner: ${winner === "A" ? a.brandName : b.brandName} (${Math.max(a.score, b.score)}/100 vs ${Math.min(a.score, b.score)}/100). ` +
          `The gap comes down to cultural fit: ${winner === "A" ? a.gaps[0].label : b.gaps[0].label} is where the bout was decided.`);

    return NextResponse.json({
      a,
      b,
      winner: winner === null ? null : winner === "A" ? a.brandName : b.brandName,
      judgeNote,
      llm: !!llmProvider(),
    });
  } catch (e) {
    console.error("versus failed", e);
    return NextResponse.json({ error: "The bout fell apart. Try again." }, { status: 500 });
  }
}
