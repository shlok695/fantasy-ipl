import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLiveSyncConfig, saveLiveSyncConfig } from "@/lib/liveSyncConfig";
import { recordAdminAudit } from "@/lib/adminAudit";
import { detectCurrentIplMatch, getMatchMaxOvers } from "@/lib/cricketApi";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user?.name !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getLiveSyncConfig();
    const detectedMatch = await detectCurrentIplMatch();
    return NextResponse.json({
      config,
      detectedMatch: detectedMatch
        ? {
            id: detectedMatch.id,
            name: detectedMatch.name,
            status: detectedMatch.status,
            overs: getMatchMaxOvers(detectedMatch),
            dateTimeGMT: detectedMatch.dateTimeGMT,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.name !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const matchId = String(body.matchId || "").trim();
    const matchStartAt = String(body.matchStartAt || "").trim();
    const enabled = Boolean(body.enabled);
    const afterOverMinutes = Number.parseInt(String(body.afterOverMinutes || ""), 10);
    const intervalMs = Number.parseInt(String(body.intervalMs || ""), 10);

    if (enabled && !matchId) {
      return NextResponse.json({ error: "Match ID is required when auto-sync is enabled" }, { status: 400 });
    }

    if (enabled && !matchStartAt) {
      return NextResponse.json({ error: "Match start time is required when auto-sync is enabled" }, { status: 400 });
    }

    if (matchStartAt && Number.isNaN(new Date(matchStartAt).getTime())) {
      return NextResponse.json({ error: "Match start time is invalid" }, { status: 400 });
    }

    const config = await saveLiveSyncConfig({
      matchId,
      matchStartAt,
      enabled,
      afterOverMinutes: Number.isFinite(afterOverMinutes) && afterOverMinutes >= 0 ? afterOverMinutes : 6,
      intervalMs: Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 60_000,
    });

    await recordAdminAudit(
      session.user!.name || "admin",
      "LIVE_SYNC_CONFIG",
      `enabled:${config.enabled ? "on" : "off"} match:${config.matchId || "-"} start:${config.matchStartAt || "-"} over:${config.afterOverMinutes} interval:${config.intervalMs}`
    );

    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
