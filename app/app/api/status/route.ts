import { NextResponse } from "next/server";
import { isLive } from "@/lib/qloo";

export async function GET() {
  const live = isLive();
  return NextResponse.json({ mock: !live, brandLive: live, marketLive: live });
}
