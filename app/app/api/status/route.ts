import { NextResponse } from "next/server";
import { isLive } from "@/lib/qloo";

export async function GET() {
  return NextResponse.json({ mock: !isLive() });
}
