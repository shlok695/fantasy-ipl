// Generic Mock Cricket API Integration
// If CRICKET_API_KEY is not set, we'll return mock stats so the user can test the points engine.
import { PlayerMatchStats } from "../utils/pointsEngine";
import { createMatchMetaFromRapidScorecard, createMatchMetaRecord } from "./matchMeta";

let cricketApiBlockedUntil = 0;
const DEFAULT_RAPIDAPI_HOST = "cricbuzz-cricket.p.rapidapi.com";
const IPL_DETECTION_CACHE_MS = 10 * 60_000;
const SECOND_FIXTURE_LOOKAHEAD_MS = 2 * 60 * 60_000;
const T20_MATCH_WINDOW_MS = 5 * 60 * 60_000;

type CachedDetection<T> = {
  value: T;
  expiresAt: number;
};

let currentIplSeriesCache: CachedDetection<SeriesSummary | null> | null = null;
let currentIplMatchCache: CachedDetection<CurrentMatchSummary | null> | null = null;
let currentIplMatchListCache: CachedDetection<CurrentMatchSummary[] | null> | null = null;

export type MatchStatsProvider = "mock" | "cricapi" | "rapidapi";

export type LiveMatchStatsResult = {
  provider: MatchStatsProvider;
  scorecard: { name: string; stats: PlayerMatchStats }[];
  fallbackReason?: string;
  statusText?: string;
  matchMeta?: {
    id: string;
    displayId?: string | null;
    shortTitle?: string | null;
    title?: string | null;
    season?: string | null;
    status?: string | null;
    team1Code?: string | null;
    team2Code?: string | null;
    team1Name?: string | null;
    team2Name?: string | null;
    source?: string | null;
    startedAt?: string | Date | null;
  };
};

function getCricApiConfig() {
  const apiKey = (process.env.CRICKET_API_KEY || "").trim();
  const isConfigured =
    Boolean(apiKey) &&
    apiKey !== "your_api_key_here" &&
    !apiKey.includes("msh");

  return {
    apiKey,
    isConfigured,
  };
}

function extractCricApiMatchPayload(data: any) {
  if (data?.data && !Array.isArray(data.data) && typeof data.data === "object") {
    return data.data;
  }

  if (Array.isArray(data?.data) && data.data[0] && typeof data.data[0] === "object") {
    return data.data[0];
  }

  if (data && typeof data === "object") {
    return data;
  }

  return null;
}

// Using standard IPL 2026 player names for the mock to ensure matches
const MOCK_SCORECARD = [
  {
    name: "MS Dhoni",
    stats: {
      runs: 25,
      ballsFaced: 12,
      fours: 2,
      sixes: 2,
      wickets: 0,
      oversBowled: 0,
      runsConceded: 0,
      maidens: 0,
      catches: 2,
      stumpings: 1,
      runOutsDirect: 0,
      runOutsIndirect: 0,
      lbwBowled: 0,
      dotBalls: 4,
      inStartingXI: true,
      isCaptain: true,
    },
  },
  {
    name: "Virat Kohli",
    stats: {
      runs: 82,
      ballsFaced: 52,
      fours: 8,
      sixes: 4,
      wickets: 0,
      oversBowled: 0,
      runsConceded: 0,
      maidens: 0,
      catches: 1,
      stumpings: 0,
      runOutsDirect: 1,
      runOutsIndirect: 0,
      lbwBowled: 0,
      dotBalls: 10,
      inStartingXI: true,
      isViceCaptain: true,
    },
  },
  {
    name: "Jasprit Bumrah",
    stats: {
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wickets: 3,
      oversBowled: 4,
      runsConceded: 16,
      maidens: 1,
      catches: 0,
      stumpings: 0,
      runOutsDirect: 0,
      runOutsIndirect: 0,
      lbwBowled: 1,
      dotBalls: 16,
      inStartingXI: true,
    },
  },
];

function createEmptyStats(): PlayerMatchStats {
  return {
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    wickets: 0,
    oversBowled: 0,
    runsConceded: 0,
    maidens: 0,
    catches: 0,
    stumpings: 0,
    runOutsDirect: 0,
    runOutsIndirect: 0,
    lbwBowled: 0,
    dotBalls: 0,
    inStartingXI: true,
  };
}

function cleanPlayerName(value: unknown): string {
  let name = String(value ?? "").trim();
  if (!name) return "Unknown";

  // Common scorecard markers / encoding artifacts (wk dagger, captain markers, etc.)
  name = name
    .replace(/^\(\s*sub\s*\)\s*/i, "")
    .replace(/^sub(?:stitute)?\s*\(\s*(.*?)\s*\)\s*$/i, "$1")
    .replace(/^sub(?:stitute)?\s+/i, "")
    .replace(/â€ |â€¡/g, "")
    .replace(/[†\u2020\u2021]/g, "")
    .replace(/\(wk\)/gi, "")
    .replace(/\(c\)/gi, "")
    .replace(/\+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return name || "Unknown";
}

function getOrCreateStats(
  playerStatsMap: Map<string, PlayerMatchStats>,
  name: string
): PlayerMatchStats {
  if (!playerStatsMap.has(name)) {
    playerStatsMap.set(name, createEmptyStats());
  }

  return playerStatsMap.get(name)!;
}

function normalizePlayerStatsMap(playerStatsMap: Map<string, PlayerMatchStats>) {
  const result = [];
  for (const [name, stats] of playerStatsMap.entries()) {
    if (name !== "Unknown") {
      result.push({ name, stats });
    }
  }
  return result;
}

function applyDismissalFielding(
  playerStatsMap: Map<string, PlayerMatchStats>,
  dismissal: string
) {
  const raw = String(dismissal || "").trim();
  if (!raw) return;

  // Caught & bowled variants: "c&b X", "c & b X", "c and b X"
  const caughtAndBowled = raw.match(/\bc\s*(?:&|and)\s*b\s+(.+)/i);
  if (caughtAndBowled?.[1]) {
    const bowlerName = cleanPlayerName(caughtAndBowled[1]);
    if (bowlerName !== "Unknown") {
      getOrCreateStats(playerStatsMap, bowlerName).catches += 1;
    }
    return;
  }

  // Alternate wording: "caught X bowled Y"
  const caughtWordy = raw.match(/\bcaught\s+(.+?)\s+bowled\s+/i);
  if (caughtWordy?.[1]) {
    const catcher = cleanPlayerName(caughtWordy[1]);
    if (catcher && catcher !== "Unknown") {
      getOrCreateStats(playerStatsMap, catcher).catches += 1;
    }
    return;
  }

  // Standard caught: "c X b Y" (including "c†X b Y" where the dagger is encoded/omitted)
  const catcherMatch = raw.match(/(?:^|\s)c(?!aught)\s*(.+?)\s+b\s+/i);
  if (catcherMatch?.[1]) {
    let catcher = catcherMatch[1].trim();
    if (catcher.startsWith("sub (") || catcher.startsWith("sub(")) {
      catcher = catcher.replace(/sub\s*\(/, "").replace(/\)/, "").trim();
    }
    catcher = cleanPlayerName(catcher);
    if (catcher && catcher !== "Unknown" && catcher !== "&" && catcher !== "and") {
      getOrCreateStats(playerStatsMap, catcher).catches += 1;
    }
    return;
  }

  // Stumping: "st X b Y"
  const stumperMatch = raw.match(/\bst\s*(.+?)\s+b\s+/i);
  if (stumperMatch?.[1]) {
    const stumper = cleanPlayerName(stumperMatch[1]);
    if (stumper && stumper !== "Unknown") {
      getOrCreateStats(playerStatsMap, stumper).stumpings += 1;
    }
    return;
  }

  if (raw.toLowerCase().includes("run out")) {
    const runnerMatch = raw.match(/run out \((.*?)\)/i);
    if (runnerMatch?.[1]) {
      const throwers = runnerMatch[1]
        .split("/")
        .map((name) => cleanPlayerName(name))
        .filter((name) => Boolean(name) && name !== "Unknown");

      if (throwers.length === 1) {
        getOrCreateStats(playerStatsMap, throwers[0]).runOutsDirect += 1;
      } else if (throwers.length > 1) {
        throwers.forEach((name) => {
          getOrCreateStats(playerStatsMap, name).runOutsIndirect += 1;
        });
      }
    }
    return;
  }

  if (raw.toLowerCase().includes("lbw") || raw.toLowerCase().startsWith("b ")) {
    const bowlerMatch = raw.match(/\bb\s+(.+)/i);
    if (bowlerMatch?.[1]) {
      const bowlerName = cleanPlayerName(bowlerMatch[1]);
      if (bowlerName && bowlerName !== "Unknown") {
        getOrCreateStats(playerStatsMap, bowlerName).lbwBowled += 1;
      }
    }
  }
}

function mapCricApiScorecard(scorecardArray: any[]) {
  const playerStatsMap = new Map<string, PlayerMatchStats>();

  for (const inning of scorecardArray) {
    if (inning.batting) {
      for (const bat of inning.batting) {
        const name = cleanPlayerName(bat.batsman?.name || "Unknown");
        const stats = getOrCreateStats(playerStatsMap, name);
        stats.runs += Number(bat.r || 0);
        stats.ballsFaced += Number(bat.b || 0);
        stats.fours += Number(bat["4s"] || 0);
        stats.sixes += Number(bat["6s"] || 0);
        applyDismissalFielding(
          playerStatsMap,
          String(
            bat["dismissal-text"] ||
              bat.dismissalText ||
              bat.dismissal ||
              ""
          )
        );
      }
    }

    if (inning.bowling) {
      for (const bowl of inning.bowling) {
        const name = cleanPlayerName(bowl.bowler?.name || "Unknown");
        const stats = getOrCreateStats(playerStatsMap, name);
        stats.oversBowled += Number(bowl.o || 0);
        stats.maidens += Number(bowl.m || 0);
        stats.runsConceded += Number(bowl.r || 0);
        stats.wickets += Number(bowl.w || 0);
        stats.dotBalls = (stats.dotBalls || 0) + Number(bowl["0s"] || bowl.d || 0);
      }
    }
  }

  return normalizePlayerStatsMap(playerStatsMap);
}

function getRapidApiConfig() {
  const apiKey = (
    process.env.RAPIDAPI_CRICBUZZ_KEY ||
    process.env.RAPIDAPI_KEY ||
    ""
  ).trim();
  const host = (
    process.env.RAPIDAPI_CRICBUZZ_HOST ||
    process.env.RAPIDAPI_HOST ||
    DEFAULT_RAPIDAPI_HOST
  ).trim();

  return { apiKey, host };
}

function isRapidApiMatchId(matchId: string) {
  return /^\d+$/.test(String(matchId || "").trim());
}

function mapRapidApiScorecard(data: any) {
  const scorecard = Array.isArray(data?.scorecard) ? data.scorecard : [];
  if (scorecard.length === 0) {
    throw new Error("RapidAPI Cricbuzz scorecard not available yet.");
  }

  const playerStatsMap = new Map<string, PlayerMatchStats>();

  for (const innings of scorecard) {
    const batsmen = Array.isArray(innings?.batsman) ? innings.batsman : [];
    for (const b of batsmen) {
      const name = cleanPlayerName(String(b?.name || b?.nickname || "Unknown"));
      if (!name || name === "Unknown") continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.runs += Number(b?.runs || b?.r || 0);
      stats.ballsFaced += Number(b?.balls || b?.b || 0);
      stats.fours += Number(b?.fours || b?.["4s"] || 0);
      stats.sixes += Number(b?.sixes || b?.["6s"] || 0);
      stats.inStartingXI = true;

      if (b?.outDesc) {
        applyDismissalFielding(playerStatsMap, String(b.outDesc));
      }
    }

    const bowlers = Array.isArray(innings?.bowler) ? innings.bowler : [];
    for (const b of bowlers) {
      const name = cleanPlayerName(String(b?.name || b?.nickname || "Unknown"));
      if (!name || name === "Unknown") continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.oversBowled += Number(b?.overs || b?.o || 0);
      stats.maidens += Number(b?.maidens || b?.m || 0);
      stats.runsConceded += Number(b?.runs || b?.r || 0);
      stats.wickets += Number(b?.wickets || b?.w || 0);
      stats.dotBalls = (stats.dotBalls || 0) + Number(b?.dots || b?.dotBalls || 0);
      stats.inStartingXI = true;
    }
  }

  return normalizePlayerStatsMap(playerStatsMap);
}

function toNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const parsed =
      typeof value === "number" ? value : Number.parseFloat(String(value));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toTrimmedString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function parseWrappedNumber(value: unknown) {
  const text = String(value || "").replace(/[()]/g, "").trim();
  return toNumber(text);
}

function parseSelfHostedLivescore(livescore: string): CurrentMatchScore[] {
  const match = String(livescore || "").match(/(\d+)\s*\/\s*(\d+)\s*\(([\d.]+)\)/);
  if (!match) {
    return [];
  }

  return [
    {
      inning: "Current",
      r: Number.parseInt(match[1], 10),
      w: Number.parseInt(match[2], 10),
      o: Number.parseFloat(match[3]),
    },
  ];
}

type SelfHostedScorePayload = {
  title?: string;
  update?: string;
  livescore?: string;
  runrate?: string;
  batterone?: string;
  batsmanonerun?: string;
  batsmanoneball?: string;
  battertwo?: string;
  batsmantworun?: string;
  batsmantwoball?: string;
  bowlerone?: string;
  bowleroneover?: string;
  bowleronerun?: string;
  bowleronewickers?: string;
  bowlertwo?: string;
  bowlertwoover?: string;
  bowlertworun?: string;
  bowlertwowickers?: string;
  [key: string]: unknown;
};

function mapFreeDataScorecard(data: any) {
  const inningsList = Object.values(data?.response || {}).filter(
    (entry) => entry && typeof entry === "object"
  ) as any[];

  const playerStatsMap = new Map<string, PlayerMatchStats>();

  for (const innings of inningsList) {
    const batters = Array.isArray(innings?.batters) ? innings.batters : [];
    for (const batter of batters) {
      const name = toTrimmedString(
        batter?.name,
        batter?.batterName,
        batter?.batName,
        batter?.nickname,
        batter?.batsman?.name
      );
      if (!name) continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.runs += toNumber(batter?.runs, batter?.r);
      stats.ballsFaced += toNumber(batter?.balls, batter?.b);
      stats.fours += toNumber(batter?.fours, batter?.["4s"], batter?.foursCount);
      stats.sixes += toNumber(batter?.sixes, batter?.["6s"], batter?.sixesCount);
      stats.inStartingXI = true;

      const dismissal = toTrimmedString(
        batter?.outDesc,
        batter?.dismissal,
        batter?.howOut
      );
      if (dismissal) {
        applyDismissalFielding(playerStatsMap, dismissal);
      }
    }

    const bowlers = Array.isArray(innings?.bowlers) ? innings.bowlers : [];
    for (const bowler of bowlers) {
      const name = toTrimmedString(
        bowler?.name,
        bowler?.bowlerName,
        bowler?.nickname,
        bowler?.bowler?.name
      );
      if (!name) continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.oversBowled += toNumber(bowler?.overs, bowler?.o);
      stats.maidens += toNumber(bowler?.maidens, bowler?.m);
      stats.runsConceded += toNumber(bowler?.runs, bowler?.r);
      stats.wickets += toNumber(bowler?.wickets, bowler?.w);
      stats.dotBalls =
        (stats.dotBalls || 0) +
        toNumber(bowler?.dots, bowler?.dotBalls, bowler?.["0s"]);
      stats.inStartingXI = true;
    }
  }

  const normalized = normalizePlayerStatsMap(playerStatsMap);
  if (normalized.length === 0) {
    throw new Error("RapidAPI Free Cricket Data scoreboard is empty.");
  }

  return normalized;
}

async function fetchRapidApiJson(endpoint: string) {
  const { apiKey, host } = getRapidApiConfig();
  if (!apiKey) {
    throw new Error("RapidAPI key is not configured.");
  }

  const res = await fetch(`https://${host}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": host,
      "x-rapidapi-key": apiKey,
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `RapidAPI request failed for ${endpoint}`);
  }

  if (data?.message === "You are not subscribed to this API.") {
    throw new Error("RapidAPI key is not subscribed to this API.");
  }

  return data;
}

async function fetchRapidApiMatchStats(
  matchId: string
): Promise<{
  scorecard: { name: string; stats: PlayerMatchStats }[];
  statusText?: string;
  matchMeta?: LiveMatchStatsResult["matchMeta"];
}> {
  const { apiKey, host } = getRapidApiConfig();
  if (!apiKey) {
    throw new Error("RapidAPI Cricbuzz key is not configured.");
  }

  if (!isRapidApiMatchId(matchId)) {
    throw new Error("RapidAPI Cricbuzz requires a numeric match ID.");
  }

  if (host.includes("free-data")) {
    const data = await fetchRapidApiJson(
      `/cricket-match-scoreboard?matchid=${encodeURIComponent(matchId)}`
    );
    return {
      scorecard: mapFreeDataScorecard(data),
      statusText: String(data?.response?.matchInfo?.status || data?.status || "").trim() || undefined,
      matchMeta: createMatchMetaRecord(matchId, {
        team1Name: data?.response?.matchInfo?.team1?.teamName || data?.response?.matchInfo?.team1Name || null,
        team2Name: data?.response?.matchInfo?.team2?.teamName || data?.response?.matchInfo?.team2Name || null,
        status: data?.response?.matchInfo?.status || data?.status || null,
        startedAt: data?.response?.matchInfo?.startDate ? new Date(Number(data.response.matchInfo.startDate)).toISOString() : null,
        source: "rapidapi",
      }),
    };
  }

  const data = await fetchRapidApiJson(`/mcenter/v1/${matchId}/scard`);
  return {
    scorecard: mapRapidApiScorecard(data),
    statusText: String(data?.status || "").trim() || undefined,
    matchMeta: createMatchMetaFromRapidScorecard(matchId, data, "rapidapi"),
  };
}

export async function fetchLiveMatchStatsWithProvider(
  matchId: string
): Promise<LiveMatchStatsResult> {
  const { apiKey, isConfigured: cricApiConfigured } = getCricApiConfig();
  const rapidApiConfig = getRapidApiConfig();
  const rapidApiConfigured = Boolean(rapidApiConfig.apiKey);
  const rapidApiCompatibleMatchId = isRapidApiMatchId(matchId);
  let rapidApiInitialError: string | null = null;

  if (
    !cricApiConfigured &&
    !rapidApiConfigured
  || matchId === "mock_test_1") {
    console.log(`[MOCK API] Using mock data for Match ID: ${matchId}`);
    await new Promise((res) => setTimeout(res, 1000));
    return {
      provider: "mock",
      scorecard: MOCK_SCORECARD,
    };
  }

  // Preserve the existing Cricbuzz flow for numeric match IDs so older admin
  // workflows keep using RapidAPI first, while UUID/non-numeric IDs use
  // Cricket Data first.
  if (rapidApiCompatibleMatchId && rapidApiConfigured) {
    try {
      const rapidScorecard = await fetchRapidApiMatchStats(matchId);
      return {
        provider: "rapidapi",
        scorecard: rapidScorecard.scorecard,
        statusText: rapidScorecard.statusText,
        matchMeta: rapidScorecard.matchMeta,
      };
    } catch (rapidError: any) {
      rapidApiInitialError =
        rapidError?.message || `RapidAPI request failed for match ${matchId}`;
    }
  }

  if (cricApiConfigured) {
    try {
      const res = await fetch(
        `https://api.cricapi.com/v1/match_scorecard?id=${matchId}&apikey=${apiKey}`
      );
      const data = await res.json();
      const payload = extractCricApiMatchPayload(data);
      const scorecard = Array.isArray(payload?.scorecard)
        ? payload.scorecard
        : Array.isArray(payload?.scoreCard)
          ? payload.scoreCard
          : [];
      const teamInfo = Array.isArray(payload?.teamInfo) ? payload.teamInfo : [];
      const teamNames = Array.isArray(payload?.teams) ? payload.teams : [];
      const team1Name =
        teamNames[0] ||
        teamInfo[0]?.name ||
        payload?.team1 ||
        payload?.team1Name ||
        null;
      const team2Name =
        teamNames[1] ||
        teamInfo[1]?.name ||
        payload?.team2 ||
        payload?.team2Name ||
        null;
      const team1Code =
        teamInfo.find((entry: any) => entry?.name === team1Name)?.shortname ||
        teamInfo[0]?.shortname ||
        null;
      const team2Code =
        teamInfo.find((entry: any) => entry?.name === team2Name)?.shortname ||
        teamInfo[1]?.shortname ||
        null;

      if (
        data.status !== "success" ||
        !payload ||
        scorecard.length === 0
      ) {
        const payloadKeys =
          payload && typeof payload === "object"
            ? Object.keys(payload).slice(0, 8).join(", ")
            : "none";
        throw new Error(
          data.reason ||
            `Invalid or unsupported match ID, or scorecard not available yet. Payload keys: ${payloadKeys}`
        );
      }

      return {
        provider: "cricapi",
        scorecard: mapCricApiScorecard(scorecard),
        statusText: String(payload?.status || data?.reason || "").trim() || undefined,
        matchMeta: createMatchMetaRecord(matchId, {
          title: payload?.name || null,
          shortTitle:
            team1Code && team2Code ? `${team1Code} vs ${team2Code}` : null,
          status: payload?.status || data?.reason || null,
          team1Code,
          team2Code,
          team1Name,
          team2Name,
          season: payload?.series_name || payload?.series || null,
          startedAt: payload?.dateTimeGMT || payload?.date || null,
          source: "cricapi",
        }),
      };
    } catch (error: any) {
      if (rapidApiConfigured && rapidApiCompatibleMatchId && !rapidApiInitialError) {
        try {
          const rapidScorecard = await fetchRapidApiMatchStats(matchId);
          console.warn(
            `[RapidAPI Fallback] Using RapidAPI for match ${matchId} after CricAPI failed: ${error.message}`
          );
          return {
            provider: "rapidapi",
            scorecard: rapidScorecard.scorecard,
            fallbackReason: error.message,
            statusText: rapidScorecard.statusText,
            matchMeta: rapidScorecard.matchMeta,
          };
        } catch (rapidError: any) {
          throw new Error(
            `Failed to map API scorecard: ${error.message}. RapidAPI fallback failed: ${rapidError?.message || "Unknown error"}`
          );
        }
      }

      throw new Error(`Failed to map API scorecard: ${error.message}`);
    }
  }

  if (rapidApiInitialError) {
    throw new Error(`RapidAPI request failed for match ${matchId}: ${rapidApiInitialError}`);
  }

  if (apiKey && !cricApiConfigured) {
    throw new Error(
      `CRICKET_API_KEY format is invalid for CricAPI. If this is a RapidAPI key, keep it in RAPIDAPI_CRICBUZZ_KEY instead.`
    );
  }

  throw new Error(
    `No supported cricket data provider is configured for match ${matchId}. CricAPI can handle any match ID, while RapidAPI requires a numeric match ID.`
  );
}

export async function fetchLiveMatchStats(
  matchId: string
): Promise<{ name: string; stats: PlayerMatchStats }[]> {
  const result = await fetchLiveMatchStatsWithProvider(matchId);
  return result.scorecard;
}

function getBlockDurationMs(reason: string) {
  const match = reason.match(/blocked for\s+(\d+)\s+minute/i);
  if (!match) {
    return 0;
  }

  const minutes = Number.parseInt(match[1], 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 0;
}

function createCricketApiError(reason: string) {
  const error = new Error(reason || "Cricket API request failed");
  const blockMs = getBlockDurationMs(reason || "");
  if (blockMs > 0) {
    cricketApiBlockedUntil = Date.now() + blockMs;
  }
  return error;
}

function assertCricketApiAvailable() {
  if (cricketApiBlockedUntil > Date.now()) {
    const remainingMs = cricketApiBlockedUntil - Date.now();
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
    throw new Error(`Blocked for ${remainingMinutes} minutes`);
  }
}

export function isCricketApiBlockedError(error: unknown) {
  return error instanceof Error && /blocked for\s+\d+\s+minute/i.test(error.message);
}

type CurrentMatchScore = {
  inning?: string;
  r?: number | string;
  w?: number | string;
  o?: number | string;
  overs?: number | string;
};

export type CurrentMatchSummary = {
  id?: string | number;
  name?: string;
  status?: string;
  matchType?: string;
  series_id?: string | number;
  series_name?: string;
  dateTimeGMT?: string;
  score?: CurrentMatchScore[];
  matchStarted?: boolean;
  matchEnded?: boolean;
  provider?: "cricapi" | "rapidapi";
  debugRaw?: unknown;
};

type SeriesSummary = {
  id?: string | number;
  name?: string;
  startDate?: string;
  endDate?: string;
  startdate?: string;
  enddate?: string;
  matches?: number;
  t20?: number;
};

type SeriesInfoResponse = {
  info?: SeriesSummary;
  matchList?: CurrentMatchSummary[];
};

type DetectionOptions = {
  forceRefresh?: boolean;
};

function isLikelyIplSeriesName(value: unknown) {
  const text = String(value || "").toLowerCase();
  return text.includes("indian premier league") || text.includes("ipl");
}

function flattenMatchStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenMatchStrings);
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(flattenMatchStrings);
  }

  return [];
}

export async function fetchCurrentMatches(): Promise<CurrentMatchSummary[]> {
  const { apiKey, isConfigured } = getCricApiConfig();
  if (!isConfigured) {
    return [];
  }

  assertCricketApiAvailable();

  const res = await fetch(
    `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`,
    { cache: "no-store" }
  );

  const data = await res.json();
  if (data.status !== "success" || !Array.isArray(data.data)) {
    throw createCricketApiError(data.reason || "Unable to fetch current matches");
  }

  return data.data as CurrentMatchSummary[];
}

function mapRapidApiLiveMatches(data: any): CurrentMatchSummary[] {
  const typeMatches = Array.isArray(data?.typeMatches) ? data.typeMatches : [];

  return typeMatches.flatMap((typeMatch: any) => {
    const seriesMatches = Array.isArray(typeMatch?.seriesMatches)
      ? typeMatch.seriesMatches
      : [];

    return seriesMatches.flatMap((seriesEntry: any) => {
      const wrappedMatches = Array.isArray(seriesEntry?.seriesAdWrapper?.matches)
        ? seriesEntry.seriesAdWrapper.matches
        : [];

      return wrappedMatches
        .map((matchEntry: any) => {
          const matchInfo = matchEntry?.matchInfo;
          if (!matchInfo?.matchId) {
            return null;
          }

          const team1Score = matchEntry?.matchScore?.team1Score || {};
          const team2Score = matchEntry?.matchScore?.team2Score || {};
          const innings = [...Object.values(team1Score), ...Object.values(team2Score)]
            .filter(Boolean)
            .map((entry: any, index) => ({
              inning: `Innings ${index + 1}`,
              r: entry?.runs ?? 0,
              w: entry?.wickets ?? 0,
              o: entry?.overs ?? 0,
            }));

          return {
            id: String(matchInfo.matchId),
            name: `${matchInfo.team1?.teamName || "Team 1"} vs ${matchInfo.team2?.teamName || "Team 2"}`,
            status: matchInfo.status,
            matchType: matchInfo.matchFormat,
            series_id: String(matchInfo.seriesId || ""),
            series_name: matchInfo.seriesName,
            dateTimeGMT: matchInfo.startDate
              ? new Date(Number(matchInfo.startDate)).toISOString()
              : undefined,
            score: innings,
            matchStarted: matchInfo.state === "In Progress",
            matchEnded: /complete|result|stumps/i.test(String(matchInfo.state || "")),
            provider: "rapidapi" as const,
            debugRaw: matchEntry,
          } satisfies CurrentMatchSummary;
        })
        .filter(Boolean);
    });
  });
}

function mapFreeDataWrappedMatch(matchInfo: any, matchScore?: any): CurrentMatchSummary | null {
  const matchId = String(matchInfo?.matchId || matchInfo?.id || "").trim();
  if (!matchId) {
    return null;
  }

  const team1Name = toTrimmedString(matchInfo?.team1?.teamName, matchInfo?.team1Name, matchInfo?.team_1);
  const team2Name = toTrimmedString(matchInfo?.team2?.teamName, matchInfo?.team2Name, matchInfo?.team_2);

  const innings = [
    ...(matchScore?.team1Score ? Object.values(matchScore.team1Score) : []),
    ...(matchScore?.team2Score ? Object.values(matchScore.team2Score) : []),
  ]
    .filter(Boolean)
    .map((entry: any, index) => ({
      inning: `Innings ${index + 1}`,
      r: toNumber(entry?.runs, entry?.r),
      w: toNumber(entry?.wickets, entry?.w),
      o: toNumber(entry?.overs, entry?.o),
    }));

  const state = toTrimmedString(matchInfo?.state, matchInfo?.status).toLowerCase();
  const status = toTrimmedString(matchInfo?.status, matchInfo?.state, matchInfo?.statusText);

  return {
    id: matchId,
    name: `${team1Name || "Team 1"} vs ${team2Name || "Team 2"}`,
    status,
    matchType: toTrimmedString(matchInfo?.matchFormat, matchInfo?.matchType),
    series_id: String(matchInfo?.seriesId || matchInfo?.series_id || ""),
    series_name: toTrimmedString(matchInfo?.seriesName, matchInfo?.series_name),
    dateTimeGMT: matchInfo?.startDate
      ? new Date(Number(matchInfo.startDate)).toISOString()
      : undefined,
    score: innings,
    matchStarted: Boolean(
      matchInfo?.matchStarted ||
        state.includes("progress") ||
        state.includes("live") ||
        innings.length > 0
    ),
    matchEnded: Boolean(
      matchInfo?.matchEnded ||
        state.includes("complete") ||
        state.includes("result")
    ),
    provider: "rapidapi" as const,
    debugRaw: {
      matchInfo,
      matchScore: matchScore || null,
    },
  };
}

function mapCricketApiFreeDataMatches(data: any): CurrentMatchSummary[] {
  const response = data?.response;

  if (Array.isArray(response)) {
    return response
      .flatMap((entry: any) => {
        if (entry?.matchInfo) {
          const mapped = mapFreeDataWrappedMatch(entry.matchInfo, entry?.matchScore);
          return mapped ? [mapped] : [];
        }

        const matchId = String(entry?.id || entry?.matchId || "").trim();
        if (!matchId) {
          return [];
        }

        return [
          {
            id: matchId,
            name: toTrimmedString(entry?.title, entry?.name, entry?.matchTitle) || "Unknown Match",
            status: toTrimmedString(entry?.status, entry?.statusText) || "Live",
            matchType: toTrimmedString(entry?.matchType, entry?.format) || "T20",
            series_id: String(entry?.series_id || entry?.seriesId || ""),
            series_name: toTrimmedString(entry?.series_name, entry?.series, entry?.competition),
            dateTimeGMT: entry?.date ? new Date(entry.date).toISOString() : undefined,
            score: [],
            matchStarted: /live|progress|innings/i.test(
              toTrimmedString(entry?.status, entry?.statusText)
            ),
            matchEnded: /finished|complete|result|won/i.test(
              toTrimmedString(entry?.status, entry?.statusText)
            ),
            provider: "rapidapi" as const,
          } satisfies CurrentMatchSummary,
        ];
      })
      .filter(Boolean);
  }

  const schedules = Array.isArray(response?.schedules) ? response.schedules : [];
  return schedules.flatMap((scheduleEntry: any) => {
    const matchScheduleList = Array.isArray(scheduleEntry?.scheduleAdWrapper?.matchScheduleList)
      ? scheduleEntry.scheduleAdWrapper.matchScheduleList
      : [];

    return matchScheduleList.flatMap((seriesEntry: any) => {
      const matchInfoList = Array.isArray(seriesEntry?.matchInfo) ? seriesEntry.matchInfo : [];
      return matchInfoList
        .map((matchInfo: any) =>
          mapFreeDataWrappedMatch(
            {
              ...matchInfo,
              seriesName: seriesEntry?.seriesName,
            },
            null
          )
        )
        .filter(Boolean);
    });
  });
}

async function fetchRapidApiCurrentMatches(): Promise<CurrentMatchSummary[]> {
  const { apiKey, host } = getRapidApiConfig();
  if (!apiKey) {
    return [];
  }

  if (host.includes("free-data")) {
    for (const endpoint of ["/cricket-matches-live", "/cricket-livescores"]) {
      try {
        const data = await fetchRapidApiJson(endpoint);
        const matches = mapCricketApiFreeDataMatches(data);
        if (matches.length > 0 || endpoint === "/cricket-livescores") {
          return matches;
        }
      } catch (error) {
        if (endpoint === "/cricket-livescores") {
          throw error;
        }
      }
    }

    return [];
  }

  const data = await fetchRapidApiJson("/matches/v1/live");
  return mapRapidApiLiveMatches(data);
}

async function fetchRapidApiLeagueScheduleMatches(): Promise<CurrentMatchSummary[]> {
  const { apiKey, host } = getRapidApiConfig();
  if (!apiKey || !host.includes("free-data")) {
    return [];
  }

  const data = await fetchRapidApiJson("/cricket-schedule-league");
  return mapCricketApiFreeDataMatches(data).filter(
    (match) =>
      isLikelyIplSeriesName(match.series_name) ||
      String(match.series_id || "") === "9241"
  );
}

export async function fetchSeries(query: string): Promise<SeriesSummary[]> {
  const { apiKey, isConfigured } = getCricApiConfig();
  if (!isConfigured) {
    return [];
  }

  assertCricketApiAvailable();

  const res = await fetch(
    `https://api.cricapi.com/v1/series?apikey=${apiKey}&search=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  if (data.status !== "success" || !Array.isArray(data.data)) {
    throw createCricketApiError(data.reason || "Unable to fetch series list");
  }

  return data.data as SeriesSummary[];
}

export async function fetchSeriesInfo(
  seriesId: string
): Promise<SeriesInfoResponse | null> {
  const { apiKey, isConfigured } = getCricApiConfig();
  if (!isConfigured || !seriesId) {
    return null;
  }

  assertCricketApiAvailable();

  const res = await fetch(
    `https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=${encodeURIComponent(seriesId)}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  if (data.status !== "success" || !data.data) {
    throw createCricketApiError(data.reason || "Unable to fetch series info");
  }

  return data.data as SeriesInfoResponse;
}

export function getMatchMaxOvers(match?: CurrentMatchSummary | null) {
  const score = Array.isArray(match?.score) ? match.score : [];
  return score.reduce((maxOvers, inning) => {
    const raw = inning?.o ?? inning?.overs ?? 0;
    const overs =
      typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    return Number.isFinite(overs) ? Math.max(maxOvers, overs) : maxOvers;
  }, 0);
}

function parseSeriesDate(raw?: string) {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMatchStartTimeMs(match?: CurrentMatchSummary | null) {
  if (!match?.dateTimeGMT) {
    return Number.NaN;
  }

  const timestamp = new Date(match.dateTimeGMT).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}

function getUtcDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function isFinishedMatch(match: CurrentMatchSummary) {
  const status = String(match.status || "").toLowerCase();
  return (
    match.matchEnded === true ||
    status.includes("won") ||
    status.includes("result") ||
    status.includes("complete") ||
    status.includes("finished")
  );
}

function isActivelyLiveMatch(match?: CurrentMatchSummary | null) {
  if (!match) {
    return false;
  }

  const status = String(match.status || "").toLowerCase();
  if (isFinishedMatch(match)) {
    return false;
  }

  return Boolean(
    match.matchStarted === true ||
      status.includes("live") ||
      status.includes("innings") ||
      status.includes("need") ||
      status.includes("trail") ||
      status.includes("require") ||
      getMatchMaxOvers(match) > 0
  );
}

function mergeDetectionDebugRaw(
  debugRaw: unknown,
  detection: Record<string, unknown>
) {
  if (debugRaw && typeof debugRaw === "object" && !Array.isArray(debugRaw)) {
    return {
      ...(debugRaw as Record<string, unknown>),
      detection,
    };
  }

  return {
    source: debugRaw ?? null,
    detection,
  };
}

function annotateDetectedMatch(
  match: CurrentMatchSummary,
  detection: Record<string, unknown>
): CurrentMatchSummary {
  return {
    ...match,
    debugRaw: mergeDetectionDebugRaw(match.debugRaw, detection),
  };
}

function selectRapidApiScheduledDoubleHeaderMatch(
  matches: CurrentMatchSummary[],
  nowMs: number
): CurrentMatchSummary | null {
  const todayKey = getUtcDayKey(nowMs);
  const todaysMatches = matches
    .map((match) => ({
      match,
      startAt: getMatchStartTimeMs(match),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.startAt) && getUtcDayKey(entry.startAt) === todayKey
    )
    .sort((a, b) => a.startAt - b.startAt);

  if (todaysMatches.length < 2) {
    return null;
  }

  const secondFixture = todaysMatches[todaysMatches.length - 1];
  const previousFixture = todaysMatches[todaysMatches.length - 2];
  const shouldUseSecondFixture =
    nowMs >= secondFixture.startAt - SECOND_FIXTURE_LOOKAHEAD_MS ||
    nowMs >= previousFixture.startAt + T20_MATCH_WINDOW_MS;

  if (!shouldUseSecondFixture) {
    return null;
  }

  return annotateDetectedMatch(
    {
      ...secondFixture.match,
      status: secondFixture.match.status || "Scheduled",
    },
    {
      reason: "rapidapi-double-header-second-fixture",
      matchCountToday: todaysMatches.length,
      selectedMatchId: secondFixture.match.id || null,
      selectedStartAt: secondFixture.match.dateTimeGMT || null,
      earlierMatchId: previousFixture.match.id || null,
      earlierMatchStartAt: previousFixture.match.dateTimeGMT || null,
    }
  );
}

function shouldPreferScheduledMatch(
  candidate: CurrentMatchSummary | null,
  scheduledMatch: CurrentMatchSummary | null,
  nowMs: number
) {
  if (!scheduledMatch) {
    return false;
  }

  if (!candidate) {
    return true;
  }

  const candidateId = String(candidate.id || "").trim();
  const scheduledId = String(scheduledMatch.id || "").trim();
  if (candidateId && scheduledId && candidateId === scheduledId) {
    return false;
  }

  if (isActivelyLiveMatch(candidate)) {
    return false;
  }

  const scheduledStartAt = getMatchStartTimeMs(scheduledMatch);
  if (!Number.isFinite(scheduledStartAt) || getUtcDayKey(scheduledStartAt) !== getUtcDayKey(nowMs)) {
    return false;
  }

  const candidateStartAt = getMatchStartTimeMs(candidate);
  if (Number.isFinite(candidateStartAt) && scheduledStartAt < candidateStartAt) {
    return false;
  }

  return true;
}

function isRelevantIplMatchCandidate(match: CurrentMatchSummary, nowMs: number) {
  const haystack = flattenMatchStrings(match).join(" ").toLowerCase();
  const looksLikeIpl =
    haystack.includes("ipl") || haystack.includes("indian premier league");
  if (!looksLikeIpl) {
    return false;
  }

  const liveish = isLiveMatchStatus(match);
  const startAt = getMatchStartTimeMs(match);
  const sameDayScheduled =
    Number.isFinite(startAt) && getUtcDayKey(startAt) === getUtcDayKey(nowMs);

  return liveish || sameDayScheduled || getMatchMaxOvers(match) > 0;
}

function dedupeAndSortDetectedMatches(matches: CurrentMatchSummary[]) {
  const seenIds = new Set<string>();
  return matches
    .filter((match) => {
      const id = String(match.id || "").trim();
      if (!id || seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    })
    .sort((left, right) => {
      const leftStart = getMatchStartTimeMs(left);
      const rightStart = getMatchStartTimeMs(right);
      const leftHasStart = Number.isFinite(leftStart);
      const rightHasStart = Number.isFinite(rightStart);

      if (leftHasStart !== rightHasStart) {
        return leftHasStart ? -1 : 1;
      }

      if (leftHasStart && rightHasStart && leftStart !== rightStart) {
        return leftStart - rightStart;
      }

      const leftOvers = getMatchMaxOvers(left);
      const rightOvers = getMatchMaxOvers(right);
      if (leftOvers !== rightOvers) {
        return rightOvers - leftOvers;
      }

      return String(left.id || "").localeCompare(String(right.id || ""));
    });
}

function getSeriesWindowScore(series: SeriesSummary, now: Date) {
  const start = parseSeriesDate(series.startDate || series.startdate);
  const end = parseSeriesDate(series.endDate || series.enddate);
  const nowTs = now.getTime();

  if (start && end && nowTs >= start.getTime() && nowTs <= end.getTime()) {
    return 3;
  }

  if (start && nowTs < start.getTime()) {
    return 2;
  }

  if (end && nowTs > end.getTime()) {
    return 1;
  }

  return 0;
}

function isLiveMatchStatus(match: CurrentMatchSummary) {
  const status = String(match.status || "").toLowerCase();
  const isFinished = match.matchEnded === true || status.includes("won") || status.includes("result") || status.includes("complete");

  // A match is "live" if it started and hasn't ended yet
  if (
    (match.matchStarted === true ||
      status.includes("live") ||
      status.includes("innings") ||
      status.includes("need") ||
      status.includes("trail") ||
      status.includes("require") ||
      getMatchMaxOvers(match) > 0) &&
    !isFinished
  ) {
    return true;
  }

  // Fallback: A match is also considered a "sync candidate" if it finished very recently
  // (e.g. within 24 hours), so we don't "miss" the auto-sync if no one visited while it was live.
  if (isFinished && match.dateTimeGMT) {
    const endedAt = new Date(match.dateTimeGMT).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    // We'll check if it started within the last 24h.
    // Usually "dateTimeGMT" is the start time.
    if (now - endedAt < twentyFourHours) {
      return true;
    }
  }

  return false;
}

export async function detectCurrentIplSeries(
  options: DetectionOptions = {}
) {
  const forceRefresh = Boolean(options.forceRefresh);
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    currentIplSeriesCache &&
    currentIplSeriesCache.expiresAt > nowMs
  ) {
    return currentIplSeriesCache.value;
  }

  const now = new Date();
  const queries = [
    `Indian Premier League ${now.getUTCFullYear()}`,
    "IPL",
    "Indian Premier League",
  ];
  const allSeries: SeriesSummary[] = [];
  const seenIds = new Set<string>();

  for (const query of queries) {
    const batch = await fetchSeries(query);
    for (const series of batch) {
      const id = String(series.id || "");
      if (id && seenIds.has(id)) {
        continue;
      }
      if (id) {
        seenIds.add(id);
      }
      allSeries.push(series);
    }

    if (allSeries.some((series) => isLikelyIplSeriesName(series.name))) {
      break;
    }
  }

  const uniqueSeries = Array.from(
    new Map(
      allSeries
        .filter((series) => {
          const name = String(series.name || "").toLowerCase();
          return name.includes("indian premier league") || name.includes("ipl");
        })
        .map((series) => [String(series.id || ""), series])
    ).values()
  );

  uniqueSeries.sort((a, b) => {
    const windowDelta =
      getSeriesWindowScore(b, now) - getSeriesWindowScore(a, now);
    if (windowDelta !== 0) return windowDelta;

    const startA = parseSeriesDate(a.startDate || a.startdate)?.getTime() || 0;
    const startB = parseSeriesDate(b.startDate || b.startdate)?.getTime() || 0;
    return startB - startA;
  });

  const detectedSeries = uniqueSeries[0] || null;
  currentIplSeriesCache = {
    value: detectedSeries,
    expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
  };

  return detectedSeries;
}

export async function detectCurrentIplMatch(
  options: DetectionOptions = {}
): Promise<CurrentMatchSummary | null> {
  const forceRefresh = Boolean(options.forceRefresh);
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    currentIplMatchCache &&
    currentIplMatchCache.expiresAt > nowMs
  ) {
    return currentIplMatchCache.value;
  }

  const { isConfigured: cricApiConfigured } = getCricApiConfig();
  const rapidApiConfigured = Boolean(getRapidApiConfig().apiKey);
  let detectedMatch: CurrentMatchSummary | null = null;
  let rapidScheduleMatchesCache: CurrentMatchSummary[] | null = null;

  async function loadRapidScheduleMatches() {
    if (!rapidApiConfigured) {
      return [];
    }

    if (rapidScheduleMatchesCache) {
      return rapidScheduleMatchesCache;
    }

    rapidScheduleMatchesCache = await fetchRapidApiLeagueScheduleMatches();
    return rapidScheduleMatchesCache;
  }

  async function getRapidDoubleHeaderMatch() {
    const scheduledMatches = await loadRapidScheduleMatches();
    return selectRapidApiScheduledDoubleHeaderMatch(scheduledMatches, nowMs);
  }

  try {
    if (cricApiConfigured) {
      const series = await detectCurrentIplSeries({ forceRefresh });
      if (series?.id) {
        const seriesInfo = await fetchSeriesInfo(String(series.id));
        const liveSeriesMatch = (seriesInfo?.matchList || [])
          .filter((match) =>
            String(match.matchType || "").toLowerCase().includes("t20")
          )
          .filter(isLiveMatchStatus)
          .sort((a, b) => getMatchMaxOvers(b) - getMatchMaxOvers(a))[0];

        if (liveSeriesMatch) {
          const doubleHeaderMatch = await getRapidDoubleHeaderMatch();
          detectedMatch = shouldPreferScheduledMatch(liveSeriesMatch, doubleHeaderMatch, nowMs)
            ? doubleHeaderMatch
            : {
                ...liveSeriesMatch,
                provider: "cricapi",
              };
          currentIplMatchCache = {
            value: detectedMatch,
            expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
          };
          return detectedMatch;
        }

        const latestSeriesMatch = (seriesInfo?.matchList || [])
          .filter((match) =>
            String(match.matchType || "").toLowerCase().includes("t20")
          )
          .sort((a, b) => {
            const timeA = a.dateTimeGMT ? new Date(a.dateTimeGMT).getTime() : 0;
            const timeB = b.dateTimeGMT ? new Date(b.dateTimeGMT).getTime() : 0;
            return timeB - timeA;
          })[0];

        if (latestSeriesMatch && isLiveMatchStatus(latestSeriesMatch)) {
          const doubleHeaderMatch = await getRapidDoubleHeaderMatch();
          detectedMatch = shouldPreferScheduledMatch(latestSeriesMatch, doubleHeaderMatch, nowMs)
            ? doubleHeaderMatch
            : {
                ...latestSeriesMatch,
                provider: "cricapi",
              };
          currentIplMatchCache = {
            value: detectedMatch,
            expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
          };
          return detectedMatch;
        }
      }

      const matches = await fetchCurrentMatches();
      const scored = matches
        .map((match) => {
          const haystack = flattenMatchStrings(match).join(" ").toLowerCase();
          const looksLikeIpl =
            haystack.includes("ipl") || haystack.includes("indian premier league");
          const liveish = isLiveMatchStatus(match);
          const t20ish = String(match.matchType || "").toLowerCase().includes("t20");

          return {
            match: {
              ...match,
              provider: "cricapi" as const,
            },
            looksLikeIpl,
            liveish,
            t20ish,
            overs: getMatchMaxOvers(match),
          };
        })
        .filter((entry) => entry.looksLikeIpl && (entry.liveish || entry.t20ish || entry.overs > 0))
        .sort((a, b) => b.overs - a.overs);

      if (scored[0]?.match) {
        const doubleHeaderMatch = await getRapidDoubleHeaderMatch();
        detectedMatch = shouldPreferScheduledMatch(scored[0].match, doubleHeaderMatch, nowMs)
          ? doubleHeaderMatch
          : scored[0].match;
        currentIplMatchCache = {
          value: detectedMatch,
          expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
        };
        return detectedMatch;
      }
    }
  } catch (error) {
    if (isCricketApiBlockedError(error) && !rapidApiConfigured) {
      throw error;
    }
    console.warn("CricAPI live IPL detection failed, trying RapidAPI fallback", error);
  }

  try {
    if (rapidApiConfigured) {
      const rapidMatches = await fetchRapidApiCurrentMatches();
      const rapidScored = rapidMatches
        .map((match) => {
          const haystack = flattenMatchStrings(match).join(" ").toLowerCase();
          const looksLikeIpl =
            haystack.includes("ipl") || haystack.includes("indian premier league");
          const liveish = isLiveMatchStatus(match);
          const t20ish = /t20|ipl/.test(String(match.matchType || "").toLowerCase());

          return {
            match,
            looksLikeIpl,
            liveish,
            t20ish,
            overs: getMatchMaxOvers(match),
          };
        })
        .filter((entry) => entry.looksLikeIpl && (entry.liveish || entry.t20ish || entry.overs > 0))
        .sort((a, b) => b.overs - a.overs);

      if (rapidScored[0]?.match) {
        const doubleHeaderMatch = await getRapidDoubleHeaderMatch();
        detectedMatch = shouldPreferScheduledMatch(rapidScored[0].match, doubleHeaderMatch, nowMs)
          ? doubleHeaderMatch
          : rapidScored[0].match;
        currentIplMatchCache = {
          value: detectedMatch,
          expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
        };
        return detectedMatch;
      }

      const scheduledRapidMatches = await loadRapidScheduleMatches();
      const doubleHeaderMatch = selectRapidApiScheduledDoubleHeaderMatch(
        scheduledRapidMatches,
        nowMs
      );
      if (doubleHeaderMatch) {
        detectedMatch = doubleHeaderMatch;
        currentIplMatchCache = {
          value: detectedMatch,
          expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
        };
        return detectedMatch;
      }

      const now = Date.now();
      const nearestScheduled = scheduledRapidMatches
        .map((match) => {
          const startAt = match.dateTimeGMT ? new Date(match.dateTimeGMT).getTime() : Number.POSITIVE_INFINITY;
          return {
            match: {
              ...match,
              status: match.status || "Scheduled",
            },
            delta: Math.abs(startAt - now),
            started: Number.isFinite(startAt) && startAt <= now,
          };
        })
        .sort((a, b) => {
          if (a.started !== b.started) {
            return a.started ? -1 : 1;
          }
          return a.delta - b.delta;
        });

      if (nearestScheduled[0]?.match) {
        detectedMatch = nearestScheduled[0].match;
        currentIplMatchCache = {
          value: detectedMatch,
          expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
        };
        return detectedMatch;
      }
    }
  } catch (rapidError) {
    console.warn("RapidAPI live IPL detection failed after CricAPI lookup", rapidError);
  }

  currentIplMatchCache = {
    value: null,
    expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
  };

  return null;
}

export async function detectCurrentIplMatches(
  options: DetectionOptions = {}
): Promise<CurrentMatchSummary[]> {
  const forceRefresh = Boolean(options.forceRefresh);
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    currentIplMatchListCache &&
    currentIplMatchListCache.expiresAt > nowMs
  ) {
    return currentIplMatchListCache.value || [];
  }

  const { isConfigured: cricApiConfigured } = getCricApiConfig();
  const rapidApiConfigured = Boolean(getRapidApiConfig().apiKey);
  const detectedMatches: CurrentMatchSummary[] = [];
  const seenIds = new Set<string>();
  const addMatch = (match: CurrentMatchSummary | null | undefined) => {
    if (!match) {
      return;
    }

    const id = String(match.id || "").trim();
    if (!id || seenIds.has(id)) {
      return;
    }

    seenIds.add(id);
    detectedMatches.push(match);
  };

  try {
    if (cricApiConfigured) {
      const series = await detectCurrentIplSeries({ forceRefresh });
      if (series?.id) {
        const seriesInfo = await fetchSeriesInfo(String(series.id));
        const seriesMatches = (seriesInfo?.matchList || [])
          .filter((match) =>
            String(match.matchType || "").toLowerCase().includes("t20")
          )
          .filter((match) => isRelevantIplMatchCandidate(match, nowMs))
          .map((match) => ({
            ...match,
            provider: "cricapi" as const,
          }));

        dedupeAndSortDetectedMatches(seriesMatches).forEach(addMatch);
        if (detectedMatches.length > 0) {
          const selected = detectedMatches.slice(0, 2);
          currentIplMatchListCache = {
            value: selected,
            expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
          };
          return selected;
        }
      }

      const currentMatches = await fetchCurrentMatches();
      dedupeAndSortDetectedMatches(
        currentMatches
          .map((match) => ({
            ...match,
            provider: "cricapi" as const,
          }))
          .filter((match) => isRelevantIplMatchCandidate(match, nowMs))
      ).forEach(addMatch);
      if (detectedMatches.length > 0) {
        const selected = detectedMatches.slice(0, 2);
        currentIplMatchListCache = {
          value: selected,
          expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
        };
        return selected;
      }
    }
  } catch {
    // Fall through to RapidAPI matching.
  }

  try {
    if (rapidApiConfigured) {
      const rapidMatches = await fetchRapidApiCurrentMatches();
      const scheduledRapidMatches = await fetchRapidApiLeagueScheduleMatches();
      const rapidCandidates = dedupeAndSortDetectedMatches(
        [...rapidMatches, ...scheduledRapidMatches]
          .map((match) => ({
            ...match,
            provider: "rapidapi" as const,
          }))
          .filter((match) => isRelevantIplMatchCandidate(match, nowMs))
      );

      rapidCandidates.forEach(addMatch);
      if (detectedMatches.length > 0) {
        const selected = detectedMatches.slice(0, 2);
        currentIplMatchListCache = {
          value: selected,
          expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
        };
        return selected;
      }

      const singleMatch = await detectCurrentIplMatch({ forceRefresh });
      if (singleMatch) {
        currentIplMatchListCache = {
          value: [singleMatch],
          expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
        };
        return [singleMatch];
      }
    }
  } catch {
    // Ignore and fall back to the single-match detector below.
  }

  const singleMatch = await detectCurrentIplMatch({ forceRefresh });
  const selected = singleMatch ? [singleMatch] : [];
  currentIplMatchListCache = {
    value: selected,
    expiresAt: nowMs + IPL_DETECTION_CACHE_MS,
  };
  return selected;
}
