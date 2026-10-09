import { NextRequest, NextResponse } from "next/server";
import { resolveBrand, resolveMarket } from "@/lib/qloo";
import { buildReport } from "@/lib/report";
import { maybeEnhanceNarrative } from "@/lib/narrative";

export async function POST(req: NextRequest) {
  try {
    const { brand, homeMarket, targetMarket } = await req.json();
    if (!brand || typeof brand !== "string" || !brand.trim()) {
      return NextResponse.json({ error: "Tell us which brand to scan." }, { status: 400 });
    }
    if (!targetMarket || typeof targetMarket !== "string") {
      return NextResponse.json({ error: "Pick a target market." }, { status: 400 });
    }

    const [{ profile, mock: brandMock }, { market: target, mock: marketMock }] =
      await Promise.all([resolveBrand(brand), resolveMarket(targetMarket)]);

    let homeName = "—";
    if (homeMarket && typeof homeMarket === "string" && homeMarket !== targetMarket) {
      try {
        homeName = (await resolveMarket(homeMarket)).market.name;
      } catch {
        homeName = "—";
      }
    }

    const report = buildReport(profile, homeName, target, brandMock || marketMock);
    report.narrative = await maybeEnhanceNarrative(report);
    return NextResponse.json(report);
  } catch (e) {
    console.error("analyze failed", e);
    return NextResponse.json({ error: "The scan hit a snag. Try again." }, { status: 500 });
  }
}
