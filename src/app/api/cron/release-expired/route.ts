import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredReservations();
  return NextResponse.json({ released, timestamp: new Date().toISOString() });
}
