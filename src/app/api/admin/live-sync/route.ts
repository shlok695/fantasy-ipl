import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getLiveSyncConfig,
  parseConfiguredLiveSyncEntries,
  saveLiveSyncConfig,
} from "@/lib/liveSyncConfig";
import { recordAdminAudit } from "@/lib/adminAudit";
import {
  detectCurrentIplMatch,
  detectCurrentIplMatches,
  getMatchMaxOvers,
} from "@/lib/cricketApi";

function sanitizeDebugPayload(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { error: "Debug payload could not be serialized" };
  }
}

function serializeDetectedMatch(detectedMatch: NonNullable<Awaited<ReturnType<typeof detectCurrentIplMatch>>>) {
  return {
    id: detectedMatch.id,
    name: detectedMatch.name,
    status: detectedMatch.status,
    overs: getMatchMaxOvers(detectedMatch),
    dateTimeGMT: detectedMatch.dateTimeGMT,
    provider: detectedMatch.provider || null,
    matchType: detectedMatch.matchType || null,
    seriesId: detectedMatch.series_id || null,
    seriesName: detectedMatch.series_name || null,
    score: detectedMatch.score || [],
    debugPayload: sanitizeDebugPayload(detectedMatch.debugRaw),
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.name !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "1";
    const config = await getLiveSyncConfig();
    const detectedMatches = await detectCurrentIplMatches({ forceRefresh });
    const detectedMatch = detectedMatches[0] || (await detectCurrentIplMatch({ forceRefresh }));
    return NextResponse.json({
      config,
      detectedMatches:
        detectedMatches.length > 0
          ? detectedMatches.map(serializeDetectedMatch)
          : detectedMatch
            ? [serializeDetectedMatch(detectedMatch)]
            : [],
      detectedMatch: detectedMatch ? serializeDetectedMatch(detectedMatch) : null,
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

    const parsedEntries = parseConfiguredLiveSyncEntries({ matchId, matchStartAt });
    if (enabled && parsedEntries.error) {
      return NextResponse.json({ error: parsedEntries.error }, { status: 400 });
    }

    const config = await saveLiveSyncConfig({
      matchId,
      matchStartAt,
      enabled,
      afterOverMinutes: Number.isFinite(afterOverMinutes) && afterOverMinutes >= 0 ? afterOverMinutes : 60,
      intervalMs: Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 1_800_000,
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
