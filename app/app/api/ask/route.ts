import { NextRequest, NextResponse } from "next/server";
import { examine, ExamTurn } from "@/lib/examine";
import type { RiskReport } from "@/lib/report";

// Body: { question: string, report: RiskReport, history: ExamTurn[] }
export async function POST(req: NextRequest) {
  try {
    const { question, report, history } = await req.json();
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Ask the analyst something." }, { status: 400 });
    }
    if (!report || typeof report.score !== "number") {
      return NextResponse.json({ error: "File a dossier first, then cross-examine it." }, { status: 400 });
    }
    const turn: ExamTurn = await examine(
      report as RiskReport,
      question.trim().slice(0, 500),
      Array.isArray(history) ? history.slice(-6) : []
    );
    return NextResponse.json(turn);
  } catch (e) {
    console.error("examine failed", e);
    return NextResponse.json({ error: "The analyst lost the thread. Try again." }, { status: 500 });
  }
}
