import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/agents";

export async function POST(req: NextRequest) {
  try {
    const { brand, homeMarket, targetMarket } = await req.json();
    if (!brand || typeof brand !== "string" || !brand.trim()) {
      return NextResponse.json({ error: "Tell us which brand to scan." }, { status: 400 });
    }
    if (!targetMarket || typeof targetMarket !== "string") {
      return NextResponse.json({ error: "Pick a target market." }, { status: 400 });
    }

    const report = await runPipeline(brand, homeMarket, targetMarket);
    return NextResponse.json(report);
  } catch (e) {
    console.error("analyze failed", e);
    return NextResponse.json({ error: "The scan hit a snag. Try again." }, { status: 500 });
  }
}
