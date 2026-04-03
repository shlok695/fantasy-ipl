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

export interface TeamMatchBreakdown {
  matchId: string;
  matchLabel: string;
  compactMatchLabel: string;
  totalPoints: number;
  createdAt?: string;
  /** Match kickoff / start from synced `Match.startedAt` when available */
  startedAt?: string | null;
  players: TeamMatchPlayerBreakdown[];
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

  const matchNumber = Number.parseInt(entry.matchId || "", 10);
  if (!Number.isNaN(matchNumber)) {
    return matchNumber;
  }

  const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
  return Number.isFinite(createdAt) ? createdAt : 0;
}

export function getPointEntryMatchLabel(entry: PlayerPointEntry, format: "compact" | "standard" | "full" = "standard") {
  return formatMatchLabel(entry.matchId, format, entry.match || null);
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
        createdAt: entry.createdAt,
        startedAt: entry.match?.startedAt ? String(entry.match.startedAt) : null,
        players: [],
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
