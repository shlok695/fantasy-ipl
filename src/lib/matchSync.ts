import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  fetchLiveMatchStatsWithProvider,
} from "@/lib/cricketApi";
import {
  hasAdminAuditAction,
  hasAdminAuditEntry,
  recordAdminAudit,
  recordAdminAuditExtended,
} from "@/lib/adminAudit";
import {
  formatSeasonAwardAuditDetails,
  getSeasonAwardBonusByTeam,
  getSeasonAwardWinners,
} from "@/lib/seasonAwards";
import { createPlayerPointsAudit } from "@/utils/pointsEngine";
import {
  recalculateLeagueTotalPoints,
  recalculateTeamTotalPoints,
} from "@/utils/teamScore";
import { getLiveSyncConfig } from "@/lib/liveSyncConfig";
import type { MatchStatsProvider } from "@/lib/cricketApi";

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
  lastCheckpoint: number | null;
};

function normalizeTeamCodeForDisplayId(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Human-readable id e.g. RRvsCSK from API team codes (team1 vs team2 order). */
export function buildDisplayIdFromTeamCodes(
  team1Code?: string | null,
  team2Code?: string | null
): string | null {
  const a = normalizeTeamCodeForDisplayId(team1Code);
  const b = normalizeTeamCodeForDisplayId(team2Code);
  if (!a || !b) {
    return null;
  }
  return `${a}vs${b}`;
}

function resolveDisplayIdForMatchUpsert(meta: {
  displayId?: string | null;
  shortTitle?: string | null;
  team1Code?: string | null;
  team2Code?: string | null;
}) {
  const direct = meta.displayId?.trim();
  if (direct) {
    return direct;
  }
  return buildDisplayIdFromTeamCodes(meta.team1Code, meta.team2Code);
}

/** Block sync when the feed clearly describes a not-yet-started match (avoids pre-match noise). */
export function shouldBlockSyncForPrematchStatus(
  provider: MatchStatsProvider,
  statusText?: string | null,
  metaStatus?: string | null
): boolean {
  if (provider === "mock") {
    return false;
  }
  const combined = [metaStatus, statusText].filter(Boolean).join(" ").trim();
  if (!combined) {
    return false;
  }
  const s = combined.toLowerCase();
  const clearlyInPlayOrDone =
    /\b(won|won by|result|tie|complete|draw|abandon|no result|match over|super over|finished|ended|innings break)\b/.test(
      s
    ) ||
    /\b(live|in progress|innings|stumps|drinks|strategic|rain|delay|opt(?:ed)? to|batting|bowling)\b/.test(
      s
    ) ||
    /\d+\/\d+/.test(s) ||
    /\bovers?\b/.test(s);
  if (clearlyInPlayOrDone) {
    return false;
  }
  return /\b(scheduled|upcoming|not started|yet to start|preview|starts on|coming soon)\b/.test(s);
}

async function writeMatchSyncExternalPlayersAudit(
  matchId: string,
  provider: MatchStatsProvider,
  unmatchedNames: string[]
) {
  if (unmatchedNames.length === 0) {
    return;
  }

  const dir = path.join(process.cwd(), "docs", "sync-audit");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `match-${matchId}-external-players.json`);
  const payload = {
    matchId,
    provider,
    externalPlayers: unmatchedNames,
    recordedAt: new Date().toISOString(),
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function normalizeName(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactNormalizedName(value: string) {
  return normalizeName(value).replace(/\s+/g, "");
}

function getNameParts(value: string) {
  return normalizeName(value).split(" ").filter(Boolean);
}

function consonantKey(value: string) {
  return normalizeName(value).replace(/[aeiou\s]/g, "");
}

function getSharedPrefixLength(a: string, b: string) {
  const max = Math.min(a.length, b.length);
  let index = 0;
  while (index < max && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

async function findBestMatchingPlayer(tx: any, apiPlayerName: string) {
  const normalizedApiName = normalizeName(apiPlayerName);
  const compactApiName = compactNormalizedName(apiPlayerName);
  const parts = getNameParts(apiPlayerName);
  const firstName = parts[0] || "";
  const lastName = parts[parts.length - 1] || "";
  const lastNamePrefix = lastName.slice(0, 5);
  const apiLastNameKey = consonantKey(lastName);

  const candidates = await tx.player.findMany({
    where: {
      OR: [
        { name: { contains: apiPlayerName } },
        ...(firstName ? [{ name: { contains: firstName } }] : []),
        ...(lastName ? [{ name: { contains: lastName } }] : []),
        ...(lastNamePrefix ? [{ name: { contains: lastNamePrefix } }] : []),
      ],
    },
    include: {
      captainOf: { select: { id: true } },
      viceCaptainOf: { select: { id: true } },
    },
  });

  let bestCandidate: any = null;
  let bestScore = -1;
  let bestNonExternalCandidate: any = null;
  let bestNonExternalScore = -1;

  for (const candidate of candidates) {
    const normalizedCandidateName = normalizeName(candidate.name);
    const compactCandidateName = compactNormalizedName(candidate.name);
    const candidateParts = getNameParts(candidate.name);
    const candidateFirstName = candidateParts[0] || "";
    const candidateLastName = candidateParts[candidateParts.length - 1] || "";
    const sharedLastNamePrefix = lastName && candidateLastName
      ? getSharedPrefixLength(lastName, candidateLastName)
      : 0;
    const firstNameInitialMatch =
      firstName &&
      candidateFirstName &&
      ((firstName.length === 1 && candidateFirstName.startsWith(firstName)) ||
        (candidateFirstName.length === 1 && firstName.startsWith(candidateFirstName)));
    const candidateLastNameKey = consonantKey(candidateLastName);
    const lastNameKeyMatch =
      Boolean(apiLastNameKey) &&
      apiLastNameKey.length >= 5 &&
      candidateLastNameKey === apiLastNameKey;
    const isExternal =
      normalizeName(candidate.acquisition || "") === "external";

    let score = 0;

    if (normalizedCandidateName === normalizedApiName) score += 100;
    if (compactCandidateName === compactApiName) score += 80;
    if (
      normalizedCandidateName.includes(normalizedApiName) ||
      normalizedApiName.includes(normalizedCandidateName)
    ) {
      score += 40;
    }
    if (firstName && candidateFirstName === firstName) score += 20;
    if (firstNameInitialMatch) score += 12;
    if (lastName && candidateLastName === lastName) score += 20;
    if (lastNameKeyMatch) score += 18;
    score += sharedLastNamePrefix * 2;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }

    if (!isExternal && score > bestNonExternalScore) {
      bestNonExternalScore = score;
      bestNonExternalCandidate = candidate;
    }
  }

  function isStrongMatch(candidate: any) {
    if (!candidate) return false;
    const normalizedCandidateName = normalizeName(candidate.name);
    const compactCandidateName = compactNormalizedName(candidate.name);
    const candidateParts = getNameParts(candidate.name);
    const candidateFirstName = candidateParts[0] || "";
    const candidateLastName = candidateParts[candidateParts.length - 1] || "";
    const sharedLastNamePrefix = lastName && candidateLastName
      ? getSharedPrefixLength(lastName, candidateLastName)
      : 0;
    const firstNameInitialMatch =
      firstName &&
      candidateFirstName &&
      ((firstName.length === 1 && candidateFirstName.startsWith(firstName)) ||
        (candidateFirstName.length === 1 && firstName.startsWith(candidateFirstName)));
    const candidateLastNameKey = consonantKey(candidateLastName);
    const lastNameKeyMatch =
      Boolean(apiLastNameKey) &&
      apiLastNameKey.length >= 5 &&
      candidateLastNameKey === apiLastNameKey;

    const strongFullNameMatch =
      normalizedCandidateName === normalizedApiName ||
      compactCandidateName === compactApiName ||
      normalizedCandidateName.includes(normalizedApiName) ||
      normalizedApiName.includes(normalizedCandidateName);

    const strongSplitNameMatch =
      firstName &&
      (candidateFirstName === firstName || firstNameInitialMatch) &&
      (candidateLastName === lastName || sharedLastNamePrefix >= 4 || lastNameKeyMatch);

    return strongFullNameMatch || strongSplitNameMatch;
  }

  // Prefer a strong match to a non-external player to avoid locking in duplicates
  // created by previous syncs (e.g. alternate spellings in the API).
  if (bestNonExternalCandidate && isStrongMatch(bestNonExternalCandidate)) {
    return bestNonExternalCandidate;
  }

  if (bestCandidate && isStrongMatch(bestCandidate)) {
    return bestCandidate;
  }

  return null;
}

const IPL_TEAM_NAME_ALIASES: Record<string, string> = {
  "chennai super kings": "CSK",
  "delhi capitals": "DC",
  "gujarat titans": "GT",
  "kolkata knight riders": "KKR",
  "lucknow super giants": "LSG",
  "mumbai indians": "MI",
  "punjab kings": "PBKS",
  "rajasthan royals": "RR",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "sunrisers hyderabad": "SRH",
};

function detectWinningIplTeamCode(statusText?: string | null): string | null {
  const candidateText = String(statusText || "").toLowerCase();
  if (!candidateText.includes("won")) {
    return null;
  }

  for (const [teamName, code] of Object.entries(IPL_TEAM_NAME_ALIASES)) {
    if (candidateText.includes(teamName)) {
      return code;
    }
  }

  return null;
}

let autoSyncPromise: Promise<AutoSyncStatus> | null = null;
let autoSyncPassiveGate:
  | {
      key: string;
      resumeAt: number;
      status: AutoSyncStatus;
    }
  | null = null;
const MIN_AUTO_SYNC_INTERVAL_MS = 30 * 60_000;
// Four quota-safe checkpoints per match:
// 1) ~10 overs first innings
// 2) ~end of first innings
// 3) ~10 overs second innings
// 4) extended final window to include slow finishes and super overs
const AUTO_SYNC_CHECKPOINT_MINUTES = [60, 120, 180, 270];
const MIN_MATCHED_PLAYER_RATIO = 0.5;
const MIN_MATCHED_PLAYER_COUNT = 8;
const FIXTURE_MATCH_WINDOW_MS = 36 * 60 * 60_000;

function buildAutoSyncGateKey(config: {
  enabled: boolean;
  matchId: string;
  matchStartAt: string;
  intervalMs: number;
}) {
  return [
    config.enabled ? "1" : "0",
    config.matchId,
    config.matchStartAt,
    String(config.intervalMs),
  ].join("|");
}

function setAutoSyncPassiveGate(
  key: string,
  status: AutoSyncStatus,
  resumeAt: number
) {
  autoSyncPassiveGate = {
    key,
    status,
    resumeAt,
  };
}

function getCheckpointAt(matchStartTime: number, checkpoint: number) {
  const checkpointMinute =
    AUTO_SYNC_CHECKPOINT_MINUTES[Math.max(0, checkpoint - 1)] ??
    AUTO_SYNC_CHECKPOINT_MINUTES[0];
  return matchStartTime + checkpointMinute * 60_000;
}

function getNextCheckpointAt(matchStartTime: number, checkpoint: number) {
  const nextCheckpointMinute = AUTO_SYNC_CHECKPOINT_MINUTES[checkpoint];
  if (typeof nextCheckpointMinute === "number") {
    return matchStartTime + nextCheckpointMinute * 60_000;
  }
  return matchStartTime + FIXTURE_MATCH_WINDOW_MS;
}

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

  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("MatchSyncState")`
  );
  const hasLastCheckpoint = columns.some((column) => column.name === "lastCheckpoint");

  if (!hasLastCheckpoint) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "MatchSyncState" ADD COLUMN "lastCheckpoint" INTEGER NOT NULL DEFAULT 0`
    );
  }
}

async function getMatchSyncState(syncKey: string) {
  await ensureMatchSyncStateTable();

  const rows = await prisma.$queryRawUnsafe<MatchSyncStateRow[]>(
    `SELECT "syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError", "lastCheckpoint"
     FROM "MatchSyncState"
     WHERE "syncKey" = ?
     LIMIT 1`,
    syncKey
  );

  return rows[0] || null;
}

async function upsertMatchSyncState(
  syncKey: string,
  updates: Partial<Pick<MatchSyncStateRow, "matchId" | "lastAttemptAt" | "lastSuccessAt" | "lastError" | "lastCheckpoint">>
) {
  await ensureMatchSyncStateTable();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "MatchSyncState" ("syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError", "lastCheckpoint")
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT("syncKey") DO UPDATE SET
       "matchId" = excluded."matchId",
       "lastAttemptAt" = excluded."lastAttemptAt",
       "lastSuccessAt" = excluded."lastSuccessAt",
       "lastError" = excluded."lastError",
       "lastCheckpoint" = excluded."lastCheckpoint"`,
    syncKey,
    updates.matchId ?? null,
    updates.lastAttemptAt ?? null,
    updates.lastSuccessAt ?? null,
    updates.lastError ?? null,
    updates.lastCheckpoint ?? 0
  );
}

function getCheckpointForElapsedMinutes(elapsedMinutes: number) {
  return AUTO_SYNC_CHECKPOINT_MINUTES.reduce((checkpoint, minuteMark, index) => {
    if (elapsedMinutes >= minuteMark) {
      return index + 1;
    }
    return checkpoint;
  }, 0);
}

async function findFixtureMatchAliases(
  tx: any,
  requestedMatchId: string,
  meta?: {
    id?: string | null;
    displayId?: string | null;
    startedAt?: string | Date | null;
  } | null
) {
  const ids = Array.from(
    new Set(
      [requestedMatchId, String(meta?.id || "").trim()]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
  const displayId = String(meta?.displayId || "").trim();
  const directMatches = ids.length
    ? await tx.match.findMany({
        where: { id: { in: ids } },
      })
    : [];

  if (!displayId) {
    return directMatches;
  }

  const byDisplayId = await tx.match.findMany({
    where: { displayId },
  });
  const startedAtTs = meta?.startedAt ? new Date(meta.startedAt).getTime() : Number.NaN;

  return Array.from(
    new Map(
      [...directMatches, ...byDisplayId]
        .filter((match) => {
          if (ids.includes(String(match.id || "").trim())) {
            return true;
          }

          if (!Number.isFinite(startedAtTs)) {
            return false;
          }

          const candidateStartedAtTs = match.startedAt
            ? new Date(match.startedAt).getTime()
            : Number.NaN;
          if (
            Number.isFinite(candidateStartedAtTs) &&
            Math.abs(candidateStartedAtTs - startedAtTs) <= FIXTURE_MATCH_WINDOW_MS
          ) {
            return true;
          }

          const candidateCreatedAtTs = match.createdAt
            ? new Date(match.createdAt).getTime()
            : Number.NaN;
          return (
            Number.isFinite(candidateCreatedAtTs) &&
            Math.abs(candidateCreatedAtTs - startedAtTs) <= FIXTURE_MATCH_WINDOW_MS
          );
        })
        .map((match) => [match.id, match])
    ).values()
  );
}

function pickCanonicalFixtureMatch(
  matches: Array<{ id: string; createdAt?: Date | string | null }>
) {
  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort((left, right) => {
    const leftCreatedAt = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightCreatedAt = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (leftCreatedAt !== rightCreatedAt) {
      return leftCreatedAt - rightCreatedAt;
    }
    return String(left.id || "").localeCompare(String(right.id || ""));
  })[0];
}

async function mergeDuplicateFixtureRows(
  tx: any,
  canonicalMatchId: string,
  aliasMatchIds: string[]
) {
  if (aliasMatchIds.length === 0) {
    return;
  }

  const aliasRows = await tx.playerPoints.findMany({
    where: {
      matchId: { in: aliasMatchIds },
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  for (const aliasRow of aliasRows) {
    const canonicalRow = await tx.playerPoints.findUnique({
      where: {
        playerId_matchId: {
          playerId: aliasRow.playerId,
          matchId: canonicalMatchId,
        },
      },
    });

    if (!canonicalRow) {
      await tx.playerPoints.update({
        where: { id: aliasRow.id },
        data: { matchId: canonicalMatchId },
      });
      continue;
    }

    const aliasUpdatedAt = aliasRow.updatedAt
      ? new Date(aliasRow.updatedAt).getTime()
      : 0;
    const canonicalUpdatedAt = canonicalRow.updatedAt
      ? new Date(canonicalRow.updatedAt).getTime()
      : 0;

    if (aliasUpdatedAt > canonicalUpdatedAt) {
      await tx.playerPoints.update({
        where: { id: canonicalRow.id },
        data: {
          simulationBatchId: aliasRow.simulationBatchId ?? canonicalRow.simulationBatchId,
          points: aliasRow.points,
          runs: aliasRow.runs,
          ballsFaced: aliasRow.ballsFaced,
          wickets: aliasRow.wickets,
          dotBalls: aliasRow.dotBalls,
          breakdownJson: aliasRow.breakdownJson,
          statsJson: aliasRow.statsJson,
          scoreVersion: aliasRow.scoreVersion,
          calculationHash: aliasRow.calculationHash,
          source: aliasRow.source,
        },
      });
    }

    await tx.playerPoints.delete({
      where: { id: aliasRow.id },
    });
  }

  for (const aliasMatchId of aliasMatchIds) {
    const remainingRows = await tx.playerPoints.count({
      where: { matchId: aliasMatchId },
    });
    if (remainingRows === 0) {
      await tx.match.delete({
        where: { id: aliasMatchId },
      });
    }
  }
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

  const scorecardResult = await fetchLiveMatchStatsWithProvider(matchId);
  const scorecard = scorecardResult.scorecard;
  if (!Array.isArray(scorecard) || scorecard.length === 0) {
    throw new Error(
      `No player stats were returned by ${scorecardResult.provider} for match ${matchId}.`
    );
  }

  const statusLine = [
    scorecardResult.matchMeta?.status,
    scorecardResult.statusText,
  ]
    .filter(Boolean)
    .join(" ");
  if (
    shouldBlockSyncForPrematchStatus(
      scorecardResult.provider,
      scorecardResult.statusText,
      scorecardResult.matchMeta?.status ?? null
    )
  ) {
    throw new Error(
      `Sync blocked for match ${matchId}: status is not Live or Finished yet (${statusLine || "unknown"}).`
    );
  }
  let successfullyMatched = 0;
  let unchangedRecords = 0;
  let staleRowsDeleted = 0;
  let seasonAwardWinners: ReturnType<typeof getSeasonAwardWinners> = [];
  const externalPlayers: string[] = [];
  let externalPlayersCreated = 0;
  const shouldAutoApplySeasonAwards =
    process.env.SEASON_FINAL_MATCH_ID === String(matchId);
  const seasonAwardsAlreadyApplied = shouldAutoApplySeasonAwards
    ? await hasAdminAuditAction("SEASON_AWARDS_APPLIED")
    : false;
  const winningIplTeamCode = detectWinningIplTeamCode(scorecardResult.statusText);
  let partnerWinBonusTeams = 0;
  let effectiveMatchIdForAudit = matchId;

  await prisma.$transaction(async (tx) => {
    const rawMatchMeta = scorecardResult.matchMeta
      ? {
          ...scorecardResult.matchMeta,
          displayId: resolveDisplayIdForMatchUpsert(scorecardResult.matchMeta),
        }
      : null;
    const fixtureMatches = await findFixtureMatchAliases(tx, matchId, rawMatchMeta);
    const canonicalMatch = pickCanonicalFixtureMatch(fixtureMatches);
    const effectiveMatchId =
      canonicalMatch?.id ||
      String(rawMatchMeta?.id || "").trim() ||
      matchId;
    effectiveMatchIdForAudit = effectiveMatchId;
    const aliasMatchIds = fixtureMatches
      .map((entry: { id?: string | null }) => String(entry.id || "").trim())
      .filter((entry: string) => Boolean(entry) && entry !== effectiveMatchId);
    const effectiveMatchMeta = rawMatchMeta
      ? {
          ...rawMatchMeta,
          id: effectiveMatchId,
        }
      : null;
    const modifiedTeams = new Set<string>();
    const matchedPlayerIds = new Set<string>();
    const pendingRows: Array<{
      dbPlayer: any;
      apiPlayer: { name: string; stats: any };
      audit: ReturnType<typeof createPlayerPointsAudit>;
    }> = [];
    const pendingExternalApiPlayers: Array<{ name: string; stats: any }> = [];

    await mergeDuplicateFixtureRows(tx, effectiveMatchId, aliasMatchIds);

    if (effectiveMatchMeta?.id) {
      const resolvedDisplayId = resolveDisplayIdForMatchUpsert(effectiveMatchMeta);
      await tx.match.upsert({
        where: { id: effectiveMatchMeta.id },
        update: {
          displayId: resolvedDisplayId,
          shortTitle: effectiveMatchMeta.shortTitle ?? null,
          title: effectiveMatchMeta.title ?? null,
          season: effectiveMatchMeta.season ?? null,
          status: effectiveMatchMeta.status ?? scorecardResult.statusText ?? null,
          team1Code: effectiveMatchMeta.team1Code ?? null,
          team2Code: effectiveMatchMeta.team2Code ?? null,
          team1Name: effectiveMatchMeta.team1Name ?? null,
          team2Name: effectiveMatchMeta.team2Name ?? null,
          source: effectiveMatchMeta.source ?? scorecardResult.provider,
          startedAt: effectiveMatchMeta.startedAt ? new Date(effectiveMatchMeta.startedAt) : null,
        },
        create: {
          id: effectiveMatchMeta.id,
          displayId: resolvedDisplayId,
          shortTitle: effectiveMatchMeta.shortTitle ?? null,
          title: effectiveMatchMeta.title ?? null,
          season: effectiveMatchMeta.season ?? null,
          status: effectiveMatchMeta.status ?? scorecardResult.statusText ?? null,
          team1Code: effectiveMatchMeta.team1Code ?? null,
          team2Code: effectiveMatchMeta.team2Code ?? null,
          team1Name: effectiveMatchMeta.team1Name ?? null,
          team2Name: effectiveMatchMeta.team2Name ?? null,
          source: effectiveMatchMeta.source ?? scorecardResult.provider,
          startedAt: effectiveMatchMeta.startedAt ? new Date(effectiveMatchMeta.startedAt) : null,
        },
      });
    }

    for (const apiPlayer of scorecard) {
      const dbPlayer = await findBestMatchingPlayer(tx, apiPlayer.name);

      if (!dbPlayer) {
        pendingExternalApiPlayers.push(apiPlayer);
        continue;
      }

      const fantasyStats = {
        ...apiPlayer.stats,
        isCaptain: Boolean(dbPlayer.captainOf),
        isViceCaptain: Boolean(dbPlayer.viceCaptainOf),
      };
      const audit = createPlayerPointsAudit(fantasyStats);

      pendingRows.push({
        dbPlayer,
        apiPlayer,
        audit,
      });
      matchedPlayerIds.add(dbPlayer.id);
    }

    const minimumExpectedMatches = Math.max(
      MIN_MATCHED_PLAYER_COUNT,
      Math.ceil(scorecard.length * MIN_MATCHED_PLAYER_RATIO)
    );

    if (pendingRows.length < minimumExpectedMatches) {
      throw new Error(
        `Aborted sync for match ${matchId}: matched only ${pendingRows.length}/${scorecard.length} players. Missing: ${pendingExternalApiPlayers.map((player) => player.name).slice(0, 8).join(", ")}`
      );
    }

    for (const apiPlayer of pendingExternalApiPlayers) {
      const name = String(apiPlayer.name || "").trim();
      if (!name) {
        continue;
      }

      let dbPlayer = await tx.player.findFirst({
        where: { name },
        include: {
          captainOf: { select: { id: true } },
          viceCaptainOf: { select: { id: true } },
        },
      });

      if (!dbPlayer) {
        dbPlayer = await tx.player.create({
          data: {
            name,
            acquisition: "External",
          },
          include: {
            captainOf: { select: { id: true } },
            viceCaptainOf: { select: { id: true } },
          },
        });
        externalPlayersCreated += 1;
      }

      externalPlayers.push(name);

      const fantasyStats = {
        ...apiPlayer.stats,
        isCaptain: Boolean(dbPlayer.captainOf),
        isViceCaptain: Boolean(dbPlayer.viceCaptainOf),
      };
      const audit = createPlayerPointsAudit(fantasyStats);

      pendingRows.push({
        dbPlayer,
        apiPlayer,
        audit,
      });
      matchedPlayerIds.add(dbPlayer.id);
    }

    for (const row of pendingRows) {
      const payload = {
        points: row.audit.finalPoints,
        runs: row.apiPlayer.stats.runs || 0,
        ballsFaced: row.apiPlayer.stats.ballsFaced || 0,
        wickets: row.apiPlayer.stats.wickets || 0,
        dotBalls: row.apiPlayer.stats.dotBalls || 0,
        breakdownJson: JSON.stringify(row.audit.breakdown),
        statsJson: JSON.stringify(row.audit.stats),
        scoreVersion: row.audit.scoreVersion,
        calculationHash: row.audit.calculationHash,
        source: `sync:${scorecardResult.provider}`,
      };

      const existingRecord = await tx.playerPoints.findUnique({
        where: {
          playerId_matchId: {
            playerId: row.dbPlayer.id,
            matchId: effectiveMatchId,
          },
        },
      });

      if (
        existingRecord &&
        existingRecord.calculationHash === row.audit.calculationHash &&
        existingRecord.points === row.audit.finalPoints &&
        existingRecord.scoreVersion === row.audit.scoreVersion
      ) {
        unchangedRecords += 1;
      } else if (existingRecord) {
        await tx.playerPoints.update({
          where: { id: existingRecord.id },
          data: payload,
        });
      } else {
        await tx.playerPoints.create({
          data: {
            playerId: row.dbPlayer.id,
            matchId: effectiveMatchId,
            ...payload,
          },
        });
      }

      if (row.dbPlayer.userId) {
        modifiedTeams.add(row.dbPlayer.userId);
      }

      successfullyMatched += 1;
    }

    const staleRows = await tx.playerPoints.findMany({
      where: {
        matchId: effectiveMatchId,
        playerId: {
          notIn: [...matchedPlayerIds],
        },
      },
      select: {
        id: true,
        player: {
          select: {
            userId: true,
          },
        },
      },
    });

    for (const staleRow of staleRows) {
      await tx.playerPoints.delete({
        where: { id: staleRow.id },
      });
      staleRowsDeleted += 1;

      if (staleRow.player?.userId) {
        modifiedTeams.add(staleRow.player.userId);
      }
    }

    for (const teamId of modifiedTeams) {
      await recalculateTeamTotalPoints(teamId, tx);
    }

    const partnerWinBonusAlreadyApplied = winningIplTeamCode
      ? (
          await tx.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT "id"
             FROM "AdminAuditLog"
             WHERE "action" = ?
               AND instr(lower("details"), lower(?)) > 0
             LIMIT 1`,
            "PARTNER_WIN_BONUS_AUTO",
            `match:${effectiveMatchId}`
          )
        ).length > 0
      : false;

    if (winningIplTeamCode && !partnerWinBonusAlreadyApplied) {
      const partnerTeams = await tx.user.findMany({
        where: { iplTeam: winningIplTeamCode },
        select: { id: true },
      });

      for (const partnerTeam of partnerTeams) {
        await tx.user.update({
          where: { id: partnerTeam.id },
          data: { bonusPoints: { increment: 50 } },
        });
        await recalculateTeamTotalPoints(partnerTeam.id, tx);
      }

      partnerWinBonusTeams = partnerTeams.length;
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

  const auditMatchDetails =
    effectiveMatchIdForAudit === matchId
      ? `match:${effectiveMatchIdForAudit}`
      : `match:${effectiveMatchIdForAudit} requested:${matchId}`;

  await recordAdminAudit(
    actor.name || "system",
    "MATCH_SYNC",
    `${auditMatchDetails} players:${successfullyMatched} unchanged:${unchangedRecords} stale:${staleRowsDeleted} external:${externalPlayers.length} provider:${scorecardResult.provider}`
  );

  if (externalPlayers.length > 0) {
    await writeMatchSyncExternalPlayersAudit(
      effectiveMatchIdForAudit,
      scorecardResult.provider,
      externalPlayers
    );
    await recordAdminAudit(
      actor.name || "system",
      "MATCH_SYNC_EXTERNAL",
      `${auditMatchDetails} count:${externalPlayers.length} created:${externalPlayersCreated} see docs/sync-audit/match-${effectiveMatchIdForAudit}-external-players.json`
    );
    await recordAdminAuditExtended(
      actor.name || "system",
      "MATCH_SYNC_EXTERNAL_NAMES",
      `${auditMatchDetails} provider:${scorecardResult.provider} names:${externalPlayers.join("; ")}`
    );
  }

  if (winningIplTeamCode && partnerWinBonusTeams > 0) {
    await recordAdminAudit(
      actor.name || "system",
      "PARTNER_WIN_BONUS_AUTO",
      `match:${effectiveMatchIdForAudit} team:${winningIplTeamCode} count:${partnerWinBonusTeams}`
    );
  }

  if (seasonAwardWinners.length > 0) {
    await recordAdminAudit(
      actor.name || "system",
      "SEASON_AWARDS_APPLIED",
      formatSeasonAwardAuditDetails(seasonAwardWinners)
    );
  }

  return {
    success: true,
    provider: scorecardResult.provider,
    fallbackReason: scorecardResult.fallbackReason || null,
    playersMatched: successfullyMatched,
    message: `Successfully synced ${successfullyMatched} players from match ${matchId} using ${scorecardResult.provider}.${unchangedRecords > 0 ? ` ${unchangedRecords} rows were already up to date.` : ""}${staleRowsDeleted > 0 ? ` ${staleRowsDeleted} stale rows were removed.` : ""}${winningIplTeamCode && partnerWinBonusTeams > 0 ? ` Partner bonus applied for ${winningIplTeamCode}.` : ""}${seasonAwardWinners.length > 0 ? " Season-end awards were applied automatically." : ""}`,
  };
}

export async function maybeAutoSyncConfiguredMatch(): Promise<AutoSyncStatus> {
  const config = await getAutoSyncRuntimeConfig();
  const gateKey = buildAutoSyncGateKey({
    enabled: config.enabled,
    matchId: String(config.matchId || "").trim(),
    matchStartAt: String(config.matchStartAt || "").trim(),
    intervalMs: config.intervalMs,
  });
  const now = Date.now();

  if (
    autoSyncPassiveGate &&
    autoSyncPassiveGate.key === gateKey &&
    autoSyncPassiveGate.resumeAt > now
  ) {
    return autoSyncPassiveGate.status;
  }

  if (!config.enabled) {
    setAutoSyncPassiveGate(gateKey, "disabled", now + 5 * 60_000);
    return "disabled";
  }

  const matchId = String(config.matchId || "").trim();
  const matchStartAt = String(config.matchStartAt || "").trim();
  if (!matchId || !matchStartAt) {
    setAutoSyncPassiveGate(gateKey, "throttled", now + 5 * 60_000);
    return "throttled";
  }

  const matchStartTime = new Date(matchStartAt).getTime();
  if (!Number.isFinite(matchStartTime)) {
    setAutoSyncPassiveGate(gateKey, "throttled", now + 5 * 60_000);
    return "throttled";
  }
  const elapsedMinutes = (Date.now() - matchStartTime) / 60_000;
  const checkpoint = getCheckpointForElapsedMinutes(elapsedMinutes);
  if (checkpoint === 0) {
    setAutoSyncPassiveGate(
      gateKey,
      "throttled",
      getCheckpointAt(matchStartTime, 1)
    );
    return "throttled";
  }

  if (autoSyncPromise) {
    return "in-progress";
  }

  const syncKey = "auto-live-match";
  const intervalMs = Math.max(config.intervalMs, MIN_AUTO_SYNC_INTERVAL_MS);
  const state = await getMatchSyncState(syncKey);
  const stateAge = state?.lastAttemptAt
    ? now - new Date(state.lastAttemptAt).getTime()
    : Number.POSITIVE_INFINITY;
  const lastCheckpoint = Number(state?.lastCheckpoint || 0);

  if (state?.matchId === matchId && lastCheckpoint >= checkpoint) {
    const status =
      checkpoint >= AUTO_SYNC_CHECKPOINT_MINUTES.length
        ? "already-synced"
        : "throttled";
    setAutoSyncPassiveGate(
      gateKey,
      status,
      getNextCheckpointAt(matchStartTime, checkpoint)
    );
    return status;
  }

  if (state?.matchId === matchId && stateAge < intervalMs) {
    setAutoSyncPassiveGate(
      gateKey,
      "throttled",
      new Date(state.lastAttemptAt || now).getTime() + intervalMs
    );
    return "throttled";
  }

  await upsertMatchSyncState(syncKey, {
    matchId,
    lastAttemptAt: new Date(now).toISOString(),
    lastSuccessAt: state?.lastSuccessAt ?? null,
    lastError: null,
    lastCheckpoint,
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
        lastCheckpoint: checkpoint,
      });

      setAutoSyncPassiveGate(
        gateKey,
        checkpoint >= AUTO_SYNC_CHECKPOINT_MINUTES.length
          ? "already-synced"
          : "throttled",
        getNextCheckpointAt(matchStartTime, checkpoint)
      );

      return "synced" as const;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown auto-sync error";

      await upsertMatchSyncState(syncKey, {
        matchId,
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: state?.lastSuccessAt ?? null,
        lastError: message.slice(0, 300),
        lastCheckpoint,
      });

      setAutoSyncPassiveGate(
        gateKey,
        "throttled",
        getNextCheckpointAt(matchStartTime, checkpoint)
      );

      return "error";
    } finally {
      autoSyncPromise = null;
    }
  })();

  return autoSyncPromise;
}
