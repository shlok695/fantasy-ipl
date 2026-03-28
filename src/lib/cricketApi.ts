// Generic Mock Cricket API Integration
// If CRICKET_API_KEY is not set, we'll return mock stats so the user can test the points engine.
import { PlayerMatchStats } from "../utils/pointsEngine";

let cricketApiBlockedUntil = 0;
const DEFAULT_RAPIDAPI_CRICBUZZ_HOST = "cricbuzz-cricket.p.rapidapi.com";

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
  if (!dismissal) return;

  if (dismissal.includes("c & b ") || dismissal.includes("c and b ")) {
    const bowlerMatch = dismissal.match(/b\s(.*)/);
    if (bowlerMatch?.[1]) {
      const bowlerStats = getOrCreateStats(playerStatsMap, bowlerMatch[1].trim());
      bowlerStats.catches += 1;
    }
    return;
  }

  if (dismissal.includes("c ") && dismissal.includes("b ")) {
    const catcherMatch = dismissal.match(/c\s+(.*?)\s+b\s+/);
    if (catcherMatch?.[1]) {
      let catcher = catcherMatch[1].trim();
      if (catcher.startsWith("sub (") || catcher.startsWith("sub(")) {
        catcher = catcher.replace(/sub\s*\(/, "").replace(/\)/, "").trim();
      }
      catcher = catcher.replace(/â€ /g, "").replace(/\+/g, "").trim();
      if (catcher && catcher !== "&" && catcher !== "and") {
        const catcherStats = getOrCreateStats(playerStatsMap, catcher);
        catcherStats.catches += 1;
      }
    }
    return;
  }

  if (dismissal.includes("st ")) {
    const stumperMatch = dismissal.match(/st\s(.*?)\sb\s/);
    if (stumperMatch?.[1]) {
      const stumperStats = getOrCreateStats(playerStatsMap, stumperMatch[1].trim());
      stumperStats.stumpings += 1;
    }
    return;
  }

  if (dismissal.includes("run out")) {
    const runnerMatch = dismissal.match(/run out \((.*?)\)/);
    if (runnerMatch?.[1]) {
      const throwers = runnerMatch[1]
        .split("/")
        .map((name) => name.trim())
        .filter(Boolean);

      if (throwers.length === 1) {
        const throwerStats = getOrCreateStats(playerStatsMap, throwers[0]);
        throwerStats.runOutsDirect += 1;
      } else if (throwers.length > 1) {
        throwers.forEach((name) => {
          const throwerStats = getOrCreateStats(playerStatsMap, name);
          throwerStats.runOutsIndirect += 1;
        });
      }
    }
    return;
  }

  if (dismissal.includes("lbw") || dismissal.startsWith("b ")) {
    const bowlerMatch = dismissal.match(/b\s(.*)/);
    if (bowlerMatch?.[1]) {
      const bowlerStats = getOrCreateStats(playerStatsMap, bowlerMatch[1].trim());
      bowlerStats.lbwBowled += 1;
    }
  }
}

function mapCricApiScorecard(scorecardArray: any[]) {
  const playerStatsMap = new Map<string, PlayerMatchStats>();

  for (const inning of scorecardArray) {
    if (inning.batting) {
      for (const bat of inning.batting) {
        const name = bat.batsman?.name || "Unknown";
        const stats = getOrCreateStats(playerStatsMap, name);
        stats.runs += Number(bat.r || 0);
        stats.ballsFaced += Number(bat.b || 0);
        stats.fours += Number(bat["4s"] || 0);
        stats.sixes += Number(bat["6s"] || 0);
        applyDismissalFielding(playerStatsMap, String(bat.dismissal || ""));
      }
    }

    if (inning.bowling) {
      for (const bowl of inning.bowling) {
        const name = bowl.bowler?.name || "Unknown";
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
    DEFAULT_RAPIDAPI_CRICBUZZ_HOST
  ).trim();

  return { apiKey, host };
}

function isRapidApiMatchId(matchId: string) {
  return /^\d+$/.test(String(matchId || "").trim());
}

function mapRapidApiScorecard(data: any) {
  const scoreCard = Array.isArray(data?.scoreCard) ? data.scoreCard : [];
  if (scoreCard.length === 0) {
    throw new Error("RapidAPI Cricbuzz scorecard not available yet.");
  }

  const playerStatsMap = new Map<string, PlayerMatchStats>();

  for (const innings of scoreCard) {
    const batsmenData = innings?.batTeamDetails?.batsmenData || {};
    for (const batter of Object.values(batsmenData) as any[]) {
      const name = String(
        batter?.batName ||
          batter?.batsmanName ||
          batter?.name ||
          "Unknown"
      ).trim();
      if (!name || name === "Unknown") continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.runs += Number(batter?.runs || batter?.r || 0);
      stats.ballsFaced += Number(batter?.balls || batter?.b || 0);
      stats.fours += Number(batter?.fours || batter?.["4s"] || 0);
      stats.sixes += Number(batter?.sixes || batter?.["6s"] || 0);
      stats.inStartingXI = true;

      applyDismissalFielding(
        playerStatsMap,
        String(batter?.outDesc || batter?.dismissal || "")
      );
    }

    const bowlersData = innings?.bowlTeamDetails?.bowlersData || {};
    for (const bowler of Object.values(bowlersData) as any[]) {
      const name = String(
        bowler?.bowlName ||
          bowler?.bowlerName ||
          bowler?.name ||
          "Unknown"
      ).trim();
      if (!name || name === "Unknown") continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.oversBowled += Number(bowler?.overs || bowler?.o || 0);
      stats.maidens += Number(bowler?.maidens || bowler?.m || 0);
      stats.runsConceded += Number(bowler?.runs || bowler?.r || 0);
      stats.wickets += Number(bowler?.wickets || bowler?.w || 0);
      stats.dotBalls = (stats.dotBalls || 0) + Number(bowler?.dots || bowler?.dotBalls || 0);
      stats.inStartingXI = true;
    }
  }

  return normalizePlayerStatsMap(playerStatsMap);
}

async function fetchRapidApiMatchStats(
  matchId: string
): Promise<{ name: string; stats: PlayerMatchStats }[]> {
  const { apiKey, host } = getRapidApiConfig();
  if (!apiKey) {
    throw new Error("RapidAPI Cricbuzz key is not configured.");
  }

  if (!isRapidApiMatchId(matchId)) {
    throw new Error("RapidAPI Cricbuzz requires a numeric match ID.");
  }

  const res = await fetch(`https://${host}/mcenter/v1/${matchId}/hscard`, {
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": host,
      "x-rapidapi-key": apiKey,
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (data?.message === "You are not subscribed to this API.") {
    throw new Error("RapidAPI Cricbuzz key is not subscribed to this API.");
  }

  return mapRapidApiScorecard(data);
}

export async function fetchLiveMatchStats(
  matchId: string
): Promise<{ name: string; stats: PlayerMatchStats }[]> {
  const apiKey = process.env.CRICKET_API_KEY;
  const rapidApiConfigured = Boolean(getRapidApiConfig().apiKey);

  if (!apiKey || apiKey === "your_api_key_here" || matchId === "mock_test_1") {
    console.log(`[MOCK API] Using mock data for Match ID: ${matchId}`);
    await new Promise((res) => setTimeout(res, 1000));
    return MOCK_SCORECARD;
  }

  try {
    const res = await fetch(
      `https://api.cricapi.com/v1/match_scorecard?id=${matchId}&apikey=${apiKey}`
    );
    const data = await res.json();

    if (
      data.status !== "success" ||
      !data.data ||
      data.data.length === 0 ||
      !data.data[0].scorecard
    ) {
      throw new Error(
        data.reason || "Invalid or unsupported match ID, or scorecard not available yet."
      );
    }

    return mapCricApiScorecard(data.data[0].scorecard);
  } catch (error: any) {
    if (rapidApiConfigured && isRapidApiMatchId(matchId)) {
      try {
        return await fetchRapidApiMatchStats(matchId);
      } catch (rapidError: any) {
        throw new Error(
          `Failed to map API scorecard: ${error.message}. RapidAPI fallback failed: ${rapidError?.message || "Unknown error"}`
        );
      }
    }

    throw new Error(`Failed to map API scorecard: ${error.message}`);
  }
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
  const apiKey = process.env.CRICKET_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
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

export async function fetchSeries(query: string): Promise<SeriesSummary[]> {
  const apiKey = process.env.CRICKET_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
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
  const apiKey = process.env.CRICKET_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here" || !seriesId) {
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
  return (
    match.matchStarted === true ||
    status.includes("live") ||
    status.includes("innings") ||
    status.includes("need") ||
    status.includes("trail") ||
    status.includes("require") ||
    getMatchMaxOvers(match) > 0
  ) && match.matchEnded !== true;
}

export async function detectCurrentIplSeries() {
  const now = new Date();
  const queries = [
    `Indian Premier League ${now.getUTCFullYear()}`,
    "Indian Premier League",
  ];

  const allSeries = (await Promise.all(queries.map((query) => fetchSeries(query)))).flat();

  const uniqueSeries = Array.from(
    new Map(
      allSeries
        .filter((series) =>
          String(series.name || "").toLowerCase().includes("indian premier league")
        )
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

  return uniqueSeries[0] || null;
}

export async function detectCurrentIplMatch(): Promise<CurrentMatchSummary | null> {
  const series = await detectCurrentIplSeries();
  if (series?.id) {
    const seriesInfo = await fetchSeriesInfo(String(series.id));
    const liveSeriesMatch = (seriesInfo?.matchList || [])
      .filter((match) =>
        String(match.matchType || "").toLowerCase().includes("t20")
      )
      .filter(isLiveMatchStatus)
      .sort((a, b) => getMatchMaxOvers(b) - getMatchMaxOvers(a))[0];

    if (liveSeriesMatch) {
      return liveSeriesMatch;
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
        match,
        looksLikeIpl,
        liveish,
        t20ish,
        overs: getMatchMaxOvers(match),
      };
    })
    .filter((entry) => entry.looksLikeIpl && (entry.liveish || entry.t20ish))
    .sort((a, b) => b.overs - a.overs);

  return scored[0]?.match || null;
}
