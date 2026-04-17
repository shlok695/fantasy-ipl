import { formatMatchLabel } from "@/lib/matchLabels";
import type { DashboardPlayer, DashboardTeam, PlayerPointEntry } from "@/components/dashboard/types";

type ParsedBreakdown = {
  lines?: Array<{ label: string; value: number }>;
  subtotal?: number;
  multiplierLabel?: string;
  multiplierValue?: number;
  finalPoints?: number;
};

type ParsedStats = {
  runs?: number;
  ballsFaced?: number;
  fours?: number;
  sixes?: number;
  wickets?: number;
  oversBowled?: number;
  runsConceded?: number;
  maidens?: number;
  catches?: number;
  stumpings?: number;
  runOutsDirect?: number;
  runOutsIndirect?: number;
  lbwBowled?: number;
  dotBalls?: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  inStartingXI?: boolean;
};

export interface TeamMatchPlayerBreakdown {
  playerId: string;
  playerName: string;
  role?: string | null;
  iplTeam?: string | null;
  points: number;
  entry: PlayerPointEntry;
  breakdown: ParsedBreakdown | null;
  stats: ParsedStats | null;
}

export interface TeamMatchBonusBreakdown {
  kind: "partner-win" | "partner-shared";
  label: string;
  description: string;
  points: number;
  teamCode: string;
}

export interface TeamMatchBreakdown {
  matchId: string;
  matchLabel: string;
  compactMatchLabel: string;
  totalPoints: number;
  bonusPoints: number;
  createdAt?: string;
  /** Match kickoff / start from synced `Match.startedAt` when available */
  startedAt?: string | null;
  players: TeamMatchPlayerBreakdown[];
  bonuses: TeamMatchBonusBreakdown[];
}

/** User-facing date for a match or point entry (local timezone). */
export function formatMatchDateLabel(iso?: string | Date | null): string | null {
  if (iso == null) return null;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getTeamMatchDateLabel(match?: Pick<TeamMatchBreakdown, "startedAt" | "createdAt"> | null) {
  if (!match) return null;
  return formatMatchDateLabel(match.startedAt || match.createdAt || null);
}

export function getPointEntryDateLabel(entry: PlayerPointEntry): string | null {
  if (entry.match?.startedAt) {
    return formatMatchDateLabel(entry.match.startedAt);
  }
  if (entry.createdAt) {
    return formatMatchDateLabel(entry.createdAt);
  }
  return null;
}

function safeParseJson<T>(value?: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getMatchSortValue(entry: PlayerPointEntry) {
  const startedAt = entry.match?.startedAt ? new Date(entry.match.startedAt).getTime() : Number.NaN;
  if (Number.isFinite(startedAt)) {
    return startedAt;
  }

  const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
  if (Number.isFinite(createdAt) && createdAt > 0) {
    return createdAt;
  }

  const updatedAt = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
  if (Number.isFinite(updatedAt) && updatedAt > 0) {
    return updatedAt;
  }

  const matchNumber = Number.parseInt(entry.matchId || "", 10);
  if (!Number.isNaN(matchNumber)) {
    return matchNumber;
  }

  return 0;
}

export function getPointEntryMatchLabel(entry: PlayerPointEntry, format: "compact" | "standard" | "full" = "standard") {
  return formatMatchLabel(entry.matchId, format, entry.match || null);
}

const IPL_TEAM_CODE_ALIASES: Record<string, string> = {
  "csk": "CSK",
  "chennai super kings": "CSK",
  "dc": "DC",
  "delhi capitals": "DC",
  "gt": "GT",
  "gujarat titans": "GT",
  "kkr": "KKR",
  "kolkata knight riders": "KKR",
  "lsg": "LSG",
  "lucknow super giants": "LSG",
  "mi": "MI",
  "mumbai indians": "MI",
  "pbks": "PBKS",
  "punjab kings": "PBKS",
  "rr": "RR",
  "rajasthan royals": "RR",
  "rcb": "RCB",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "srh": "SRH",
  "sunrisers hyderabad": "SRH",
};

function normalizeIplTeamCode(value?: string | null): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const compact = raw.toUpperCase().replace(/\s+/g, "");
  if (Object.values(IPL_TEAM_CODE_ALIASES).includes(compact)) {
    return compact;
  }

  return IPL_TEAM_CODE_ALIASES[raw.toLowerCase()] || null;
}

function detectWinningIplTeamCode(statusText?: string | null): string | null {
  const candidateText = String(statusText || "").toLowerCase();
  if (!candidateText.includes("won")) {
    return null;
  }

  for (const [teamName, code] of Object.entries(IPL_TEAM_CODE_ALIASES)) {
    if (candidateText.includes(teamName)) {
      return code;
    }
  }

  return null;
}

function isSharedResultStatus(statusText?: string | null): boolean {
  return /\b(no result|abandon(?:ed)?|washout)\b/.test(String(statusText || "").toLowerCase());
}

function inferPartnerBonusForMatch(
  match: TeamMatchBreakdown,
  teamIplCode?: string | null
): TeamMatchBonusBreakdown | null {
  const userTeamCode = normalizeIplTeamCode(teamIplCode);
  if (!userTeamCode || match.players.length === 0) {
    return null;
  }

  const matchMeta = match.players[0]?.entry?.match;
  const status = String(matchMeta?.status || "").trim();
  const team1Code = normalizeIplTeamCode(matchMeta?.team1Code || matchMeta?.team1Name);
  const team2Code = normalizeIplTeamCode(matchMeta?.team2Code || matchMeta?.team2Name);

  if (isSharedResultStatus(status) && (userTeamCode === team1Code || userTeamCode === team2Code)) {
    return {
      kind: "partner-shared",
      label: "Shared match bonus",
      description: `${userTeamCode} received the abandoned/no-result split bonus`,
      points: 25,
      teamCode: userTeamCode,
    };
  }

  const winnerCode = detectWinningIplTeamCode(status);
  if (winnerCode && winnerCode === userTeamCode) {
    return {
      kind: "partner-win",
      label: "Partner win bonus",
      description: `${userTeamCode} received the IPL partner match-win bonus`,
      points: 50,
      teamCode: userTeamCode,
    };
  }

  return null;
}

export function getTeamMatchBreakdowns(team: DashboardTeam | null | undefined): TeamMatchBreakdown[] {
  const grouped = new Map<string, TeamMatchBreakdown>();

  for (const player of team?.players || []) {
    for (const entry of player.points || []) {
      if (!entry.matchId) continue;

      const matchId = String(entry.matchId);
      const existing = grouped.get(matchId) || {
        matchId,
        matchLabel: getPointEntryMatchLabel(entry, "standard"),
        compactMatchLabel: getPointEntryMatchLabel(entry, "compact"),
        totalPoints: 0,
        bonusPoints: 0,
        createdAt: entry.createdAt,
        startedAt: entry.match?.startedAt ? String(entry.match.startedAt) : null,
        players: [],
        bonuses: [],
      };

      if (entry.match?.startedAt && !existing.startedAt) {
        existing.startedAt = String(entry.match.startedAt);
      }

      existing.totalPoints += entry.points || 0;
      if (!existing.createdAt || new Date(existing.createdAt).getTime() < new Date(entry.createdAt || 0).getTime()) {
        existing.createdAt = entry.createdAt;
      }
      existing.players.push({
        playerId: player.id,
        playerName: player.name,
        role: player.role,
        iplTeam: player.iplTeam,
        points: entry.points || 0,
        entry,
        breakdown: safeParseJson<ParsedBreakdown>(entry.breakdownJson),
        stats: safeParseJson<ParsedStats>(entry.statsJson),
      });

      grouped.set(matchId, existing);
    }
  }

  return [...grouped.values()]
    .sort((a, b) => {
      const sortDelta = getMatchSortValue(b.players[0]?.entry || {}) - getMatchSortValue(a.players[0]?.entry || {});
      if (sortDelta !== 0) return sortDelta;
      return (b.matchId || "").localeCompare(a.matchId || "");
    })
    .map((match) => ({
      ...match,
      bonusPoints: (() => {
        const bonus = inferPartnerBonusForMatch(match, team?.iplTeam);
        return bonus ? bonus.points : 0;
      })(),
      bonuses: (() => {
        const bonus = inferPartnerBonusForMatch(match, team?.iplTeam);
        return bonus ? [bonus] : [];
      })(),
      totalPoints: match.totalPoints,
      players: [...match.players].sort((a, b) => {
        const pointDelta = b.points - a.points;
        if (pointDelta !== 0) return pointDelta;
        return a.playerName.localeCompare(b.playerName);
      }),
    }));
}

export function getLatestAndPreviousTeamMatches(team: DashboardTeam | null | undefined) {
  const matches = getTeamMatchBreakdowns(team);

  return {
    latestMatch: matches[0] || null,
    previousMatch: matches[1] || null,
    matches,
  };
}

export function getPlayerPointHistory(player: DashboardPlayer | null | undefined) {
  return [...(player?.points || [])].sort((a, b) => {
    const sortDelta = getMatchSortValue(b) - getMatchSortValue(a);
    if (sortDelta !== 0) return sortDelta;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}
