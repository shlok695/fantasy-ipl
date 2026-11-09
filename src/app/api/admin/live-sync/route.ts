import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getLiveSyncConfig,
  parseConfiguredLiveSyncEntries,
  saveLiveSyncConfig,
} from "@/lib/liveSyncConfig";
import { recordAdminAudit } from "@/lib/adminAudit";
import { prisma } from "@/lib/prisma";
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

function isFinalMatchStatus(statusText?: string | null) {
  const status = String(statusText || "").toLowerCase();
  if (!status.trim()) {
    return false;
  }

  return /\b(won|won by|lost|no result|abandon(?:ed)?|washout|match over|finished|complete(?:d)?|super over)\b/.test(status);
}

type MatchSyncStateSnapshot = {
  syncKey: string;
  matchId: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastCheckpoint: number | null;
};

async function ensureMatchSyncStateTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MatchSyncState" (
      "syncKey" TEXT PRIMARY KEY,
      "matchId" TEXT,
      "lastAttemptAt" DATETIME,
      "lastSuccessAt" DATETIME,
      "lastError" TEXT,
      "lastCheckpoint" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function getSyncStateByMatchId(matchIds: string[]) {
  const uniqueIds = Array.from(new Set(matchIds.map((id) => id.trim()).filter(Boolean)));
  const byMatchId = new Map<string, MatchSyncStateSnapshot>();

  if (uniqueIds.length === 0) {
    return byMatchId;
  }

  await ensureMatchSyncStateTable();

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<MatchSyncStateSnapshot[]>(
    `
      SELECT "syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError", "lastCheckpoint"
      FROM "MatchSyncState"
      WHERE "matchId" IN (${placeholders})
        AND (
          "syncKey" LIKE 'auto-live-match:%'
          OR "syncKey" LIKE 'auto-scheduled-match:%'
          OR "syncKey" LIKE 'auto-unfinished-match:%'
        )
      ORDER BY
        CASE WHEN "lastSuccessAt" IS NULL THEN 1 ELSE 0 END,
        COALESCE("lastSuccessAt", "lastAttemptAt") DESC
    `,
    ...uniqueIds
  );

  for (const row of rows) {
    const matchId = String(row.matchId || "").trim();
    if (matchId && !byMatchId.has(matchId)) {
      byMatchId.set(matchId, row);
    }
  }

  return byMatchId;
}

function serializeSyncState(
  detectedMatch: NonNullable<Awaited<ReturnType<typeof detectCurrentIplMatch>>>,
  syncState?: MatchSyncStateSnapshot
) {
  if (!syncState) {
    return null;
  }

  const syncStatus = syncState.lastSuccessAt
    ? isFinalMatchStatus(detectedMatch.status)
      ? "complete"
      : "partial"
    : syncState.lastError
      ? "error"
      : syncState.lastAttemptAt
        ? "attempted"
        : "waiting";

  return {
    status: syncStatus,
    syncKey: syncState.syncKey,
    lastAttemptAt: syncState.lastAttemptAt,
    lastSuccessAt: syncState.lastSuccessAt,
    lastError: syncState.lastError,
    lastCheckpoint: syncState.lastCheckpoint,
  };
}

function serializeDetectedMatch(
  detectedMatch: NonNullable<Awaited<ReturnType<typeof detectCurrentIplMatch>>>,
  syncState?: MatchSyncStateSnapshot
) {
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
    syncState: serializeSyncState(detectedMatch, syncState),
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
    const matchesForResponse =
      detectedMatches.length > 0 ? detectedMatches : detectedMatch ? [detectedMatch] : [];
    const syncStateByMatchId = await getSyncStateByMatchId(
      matchesForResponse.map((match) => String(match.id || ""))
    );

    return NextResponse.json({
      config,
      detectedMatches: matchesForResponse.map((match) =>
        serializeDetectedMatch(match, syncStateByMatchId.get(String(match.id || "").trim()))
      ),
      detectedMatch: detectedMatch
        ? serializeDetectedMatch(
            detectedMatch,
            syncStateByMatchId.get(String(detectedMatch.id || "").trim())
          )
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
