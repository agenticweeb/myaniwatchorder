import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const MIN_SAMPLE = 20;
const TIERS = ["essential", "recommended", "optional", "skip"] as const;

export async function GET(request: NextRequest) {
  try {
    const ids = (new URL(request.url).searchParams.get("mediaIds") || "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 40);

    const rows = await Promise.all(ids.map(async (mediaId) => {
      const raw = await redis.hgetall<Record<string, string>>(`skiptier:${mediaId}`);
      const counts = Object.fromEntries(TIERS.map((tier) => [tier, Number(raw?.[tier] || 0)]));
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const top = total >= MIN_SAMPLE
        ? (TIERS.reduce((winner, tier) => counts[tier] > counts[winner] ? tier : winner, "essential" as string))
        : null;
      return { mediaId, counts, total, top, reliable: total >= MIN_SAMPLE };
    }));

    return NextResponse.json({ success: true, minSample: MIN_SAMPLE, rows });
  } catch (error) {
    console.error("Skip Ledger API Error:", error);
    return NextResponse.json({ success: false, error: "Unable to read Skip Ledger" }, { status: 500 });
  }
}
