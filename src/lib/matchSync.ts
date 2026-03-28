import { prisma } from "@/lib/prisma";
import {
  detectCurrentIplMatch,
  fetchLiveMatchStats,
  getMatchMaxOvers,
  isCricketApiBlockedError,
} from "@/lib/cricketApi";
import { hasAdminAuditAction, recordAdminAudit } from "@/lib/adminAudit";
import {
  formatSeasonAwardAuditDetails,
  getSeasonAwardBonusByTeam,
  getSeasonAwardWinners,
} from "@/lib/seasonAwards";
import { calculateDream11Points } from "@/utils/pointsEngine";
import {
  recalculateLeagueTotalPoints,
  recalculateTeamTotalPoints,
} from "@/utils/teamScore";
import { getLiveSyncConfig } from "@/lib/liveSyncConfig";

type SyncActor = {
  name: string;
  bypassAdmin?: boolean;
};

type AutoSyncStatus =
  | "disabled"
  | "already-synced"
  | "throttled"
  | "in-progress"
  | "synced"
  | "error";

type MatchSyncStateRow = {
  syncKey: string;
  matchId: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

let autoSyncPromise: Promise<AutoSyncStatus> | null = null;
const MIN_AUTO_SYNC_INTERVAL_MS = 6 * 60_000;

async function ensureMatchSyncStateTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MatchSyncState" (
      "syncKey" TEXT PRIMARY KEY,
      "matchId" TEXT,
      "lastAttemptAt" DATETIME,
      "lastSuccessAt" DATETIME,
      "lastError" TEXT
    )
  `);
}

async function getMatchSyncState(syncKey: string) {
  await ensureMatchSyncStateTable();

  const rows = await prisma.$queryRawUnsafe<MatchSyncStateRow[]>(
    `SELECT "syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError"
     FROM "MatchSyncState"
     WHERE "syncKey" = ?
     LIMIT 1`,
    syncKey
  );

  return rows[0] || null;
}

async function upsertMatchSyncState(
  syncKey: string,
  updates: Partial<Pick<MatchSyncStateRow, "matchId" | "lastAttemptAt" | "lastSuccessAt" | "lastError">>
) {
  await ensureMatchSyncStateTable();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "MatchSyncState" ("syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError")
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT("syncKey") DO UPDATE SET
       "matchId" = excluded."matchId",
       "lastAttemptAt" = excluded."lastAttemptAt",
       "lastSuccessAt" = excluded."lastSuccessAt",
       "lastError" = excluded."lastError"`,
    syncKey,
    updates.matchId ?? null,
    updates.lastAttemptAt ?? null,
    updates.lastSuccessAt ?? null,
    updates.lastError ?? null
  );
}

async function getAutoSyncRuntimeConfig() {
  const stored = await getLiveSyncConfig();
  const envMatchId = (
    process.env.AUTO_SYNC_MATCH_ID ||
    process.env.LIVE_MATCH_ID ||
    process.env.CURRENT_MATCH_ID ||
    ""
  ).trim();
  const envStartAt = (
    process.env.AUTO_SYNC_MATCH_START_AT ||
    process.env.LIVE_MATCH_START_AT ||
    process.env.CURRENT_MATCH_START_AT ||
    ""
  ).trim();
  const envAfterOverMinutes = Number.parseInt(
    process.env.AUTO_SYNC_AFTER_OVER_MINUTES || "",
    10
  );
  const envIntervalMs = Number.parseInt(
    process.env.AUTO_SYNC_INTERVAL_MS || "",
    10
  );

  const matchId = envMatchId || stored.matchId;
  const matchStartAt = envStartAt || stored.matchStartAt;
  const afterOverMinutes =
    Number.isFinite(envAfterOverMinutes) && envAfterOverMinutes >= 0
      ? envAfterOverMinutes
      : stored.afterOverMinutes;
  const intervalMs =
    Number.isFinite(envIntervalMs) && envIntervalMs > 0
      ? envIntervalMs
      : stored.intervalMs;
  const enabled = envMatchId ? true : stored.enabled;

  return {
    matchId,
    matchStartAt,
    afterOverMinutes,
    intervalMs,
    enabled,
  };
}

export async function syncMatchPoints(matchId: string, actor: SyncActor) {
  if (!actor.bypassAdmin && actor.name !== "admin") {
    throw new Error("Unauthorized");
  }

  if (!matchId) {
    throw new Error("Match ID is required");
  }

  const existingMatchPoints = await prisma.playerPoints.findFirst({
    where: { matchId },
  });

  if (existingMatchPoints) {
    throw new Error(`Match ${matchId} has already been synced!`);
  }

  const scorecard = await fetchLiveMatchStats(matchId);
  let successfullyMatched = 0;
  let seasonAwardWinners: ReturnType<typeof getSeasonAwardWinners> = [];
  const shouldAutoApplySeasonAwards =
    process.env.SEASON_FINAL_MATCH_ID === String(matchId);
  const seasonAwardsAlreadyApplied = shouldAutoApplySeasonAwards
    ? await hasAdminAuditAction("SEASON_AWARDS_APPLIED")
    : false;

  await prisma.$transaction(async (tx) => {
    const modifiedTeams = new Set<string>();

    for (const apiPlayer of scorecard) {
      const dbPlayer = await tx.player.findFirst({
        where: { name: { contains: apiPlayer.name } },
        include: {
          captainOf: { select: { id: true } },
          viceCaptainOf: { select: { id: true } },
        },
      });

      if (!dbPlayer) {
        continue;
      }

      const fantasyStats = {
        ...apiPlayer.stats,
        isCaptain: Boolean(dbPlayer.captainOf),
        isViceCaptain: Boolean(dbPlayer.viceCaptainOf),
      };
      const pointsGenerated = calculateDream11Points(fantasyStats);

      await tx.playerPoints.create({
        data: {
          playerId: dbPlayer.id,
          points: pointsGenerated,
          matchId,
          runs: apiPlayer.stats.runs || 0,
          ballsFaced: apiPlayer.stats.ballsFaced || 0,
          wickets: apiPlayer.stats.wickets || 0,
          dotBalls: apiPlayer.stats.dotBalls || 0,
        },
      });

      if (dbPlayer.userId) {
        modifiedTeams.add(dbPlayer.userId);
      }

      successfullyMatched += 1;
    }

    for (const teamId of modifiedTeams) {
      await recalculateTeamTotalPoints(teamId, tx);
    }

    if (shouldAutoApplySeasonAwards && !seasonAwardsAlreadyApplied) {
      const players = await tx.player.findMany({
        where: { userId: { not: null }, role: { not: "IPL TEAM" } },
        select: {
          id: true,
          name: true,
          userId: true,
          user: { select: { name: true } },
          points: {
            select: {
              points: true,
              runs: true,
              wickets: true,
            },
          },
        },
      });

      seasonAwardWinners = getSeasonAwardWinners(players);

      const bonusByTeam = getSeasonAwardBonusByTeam(seasonAwardWinners);
      for (const [teamId, points] of bonusByTeam.entries()) {
        await tx.user.update({
          where: { id: teamId },
          data: { bonusPoints: { increment: points } },
        });
      }

      if (seasonAwardWinners.length > 0) {
        await recalculateLeagueTotalPoints(tx);
      }
    }
  });

  await recordAdminAudit(
    actor.name || "system",
    "MATCH_SYNC",
    `match:${matchId} players:${successfullyMatched}`
  );

  if (seasonAwardWinners.length > 0) {
    await recordAdminAudit(
      actor.name || "system",
      "SEASON_AWARDS_APPLIED",
      formatSeasonAwardAuditDetails(seasonAwardWinners)
    );
  }

  return {
    success: true,
    message: `Successfully synced ${successfullyMatched} players from match ${matchId}.${seasonAwardWinners.length > 0 ? " Season-end awards were applied automatically." : ""}`,
  };
}

export async function maybeAutoSyncConfiguredMatch(): Promise<AutoSyncStatus> {
  const config = await getAutoSyncRuntimeConfig();
  const shouldAutoDetect = !config.enabled && !config.matchId;
  if (!config.enabled && !shouldAutoDetect) {
    return "disabled";
  }

  let detectedMatch = null;
  try {
    detectedMatch = shouldAutoDetect ? await detectCurrentIplMatch() : null;
  } catch (error) {
    if (isCricketApiBlockedError(error)) {
      return "throttled";
    }
    throw error;
  }
  const matchId = config.matchId || String(detectedMatch?.id || "").trim();

  if (!matchId) {
    return "disabled";
  }

  if (detectedMatch && getMatchMaxOvers(detectedMatch) < 1) {
    return "throttled";
  }

  if (!detectedMatch && config.matchStartAt) {
    const configuredStartAt = new Date(config.matchStartAt);
    const eligibleAt =
      configuredStartAt.getTime() + config.afterOverMinutes * 60_000;
    if (Date.now() < eligibleAt) {
      return "throttled";
    }
  }

  const existingMatchPoints = await prisma.playerPoints.findFirst({
    where: { matchId },
    select: { id: true },
  });
  if (existingMatchPoints) {
    return "already-synced";
  }

  if (autoSyncPromise) {
    return "in-progress";
  }

  const syncKey = "auto-live-match";
  const intervalMs = Math.max(config.intervalMs, MIN_AUTO_SYNC_INTERVAL_MS);
  const now = Date.now();
  const state = await getMatchSyncState(syncKey);
  const stateAge = state?.lastAttemptAt
    ? now - new Date(state.lastAttemptAt).getTime()
    : Number.POSITIVE_INFINITY;

  if (state?.matchId === matchId && stateAge < intervalMs) {
    return "throttled";
  }

  await upsertMatchSyncState(syncKey, {
    matchId,
    lastAttemptAt: new Date(now).toISOString(),
    lastSuccessAt: state?.lastSuccessAt ?? null,
    lastError: null,
  });

  autoSyncPromise = (async () => {
    try {
      await syncMatchPoints(matchId, {
        name: "system:auto-sync",
        bypassAdmin: true,
      });

      await upsertMatchSyncState(syncKey, {
        matchId,
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        lastError: null,
      });

      return "synced" as const;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown auto-sync error";

      const isAlreadySynced = /already been synced/i.test(message);
      await upsertMatchSyncState(syncKey, {
        matchId,
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: isAlreadySynced ? new Date().toISOString() : state?.lastSuccessAt ?? null,
        lastError: isAlreadySynced ? null : message.slice(0, 300),
      });

      return isAlreadySynced ? "already-synced" : "error";
    } finally {
      autoSyncPromise = null;
    }
  })();

  return autoSyncPromise;
}
