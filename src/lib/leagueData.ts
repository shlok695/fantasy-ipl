import {
  Activity,
  Crown,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { formatMatchLabel } from "@/lib/matchLabels";
import { getTopPlayers } from "@/lib/teamMetrics";
import { getLatestAndPreviousTeamMatches } from "@/lib/teamHistory";
import type {
  DashboardPlayer,
  DashboardTeam,
  PlayerPointEntry,
  SpotlightItem,
  StatItem,
  TeamSummary,
} from "@/components/dashboard/types";

export type AggregatedPlayer = DashboardPlayer & {
  totalPoints: number;
  totalRuns: number;
  totalWickets: number;
  totalDotBalls: number;
  innings50s: number;
  innings100s: number;
  matches: number;
  sr: number;
};

export interface ActivityEntry {
  playerName: string;
  teamName?: string | null;
  matchId?: string | null;
  matchLabel: string;
  matchMeta?: PlayerPointEntry["match"];
  points: number;
  createdAt?: string;
}

export interface PlayerLeader {
  label: string;
  statLabel: string;
  statValue: string;
  accentClass: string;
  player: AggregatedPlayer | null;
}

export interface WeeklyAward {
  matchId: string;
  matchLabel: string;
  compactMatchLabel: string;
  title: string;
  winner: string;
  teamName: string | null | undefined;
  value: string;
  description: string;
}

export interface Milestone {
  title: string;
  description: string;
  accent: string;
}

export interface TeamBadge {
  label: string;
  tone: string;
}

export interface TeamComparison {
  title: string;
  summary: string;
  left: TeamSummary;
  right: TeamSummary;
}

export interface LeagueDerivedData {
  teams: DashboardTeam[];
  allPlayers: DashboardPlayer[];
  aggregatedPlayers: AggregatedPlayer[];
  activePlayers: AggregatedPlayer[];
  stats: StatItem[];
  teamSummaries: TeamSummary[];
  topTeams: TeamSummary[];
  topPlayer: AggregatedPlayer | null;
  /** Season aggregate — display only; not the end-of-league bonus awards */
  orangeCapHolder: AggregatedPlayer | null;
  /** Season aggregate — display only */
  purpleCapHolder: AggregatedPlayer | null;
  playerLeaders: PlayerLeader[];
  spotlightItems: SpotlightItem[];
  latestActivity: ActivityEntry[];
  weeklyAwards: WeeklyAward[];
  milestones: Milestone[];
  seasonStory: string;
  seasonStoryShort: string;
  leaderboardPreview: TeamSummary[];
  seasonLeadersPreview: PlayerLeader[];
  recentActivityPreview: ActivityEntry[];
  teamComparisons: TeamComparison[];
  teamBadges: Record<string, TeamBadge[]>;
  latestMatchId: string | null;
}

function toMatchNumber(matchId?: string | null) {
  const numeric = Number.parseInt(matchId || "", 10);
  return Number.isNaN(numeric) ? -1 : numeric;
}

function getWeekStartUtc(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekKeyUtc(date: Date) {
  const start = getWeekStartUtc(date);
  const yyyy = start.getUTCFullYear();
  const mm = String(start.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(start.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPoints(value: number) {
  return `${Math.round(value)} pts`;
}

function aggregatePlayer(player: DashboardPlayer): AggregatedPlayer {
  let totalRuns = 0;
  let totalBalls = 0;
  let totalWickets = 0;
  let totalDotBalls = 0;
  let totalPoints = 0;
  let innings50s = 0;
  let innings100s = 0;

  (player.points || []).forEach((match) => {
    const runs = match.runs || 0;
    totalRuns += runs;
    totalBalls += match.ballsFaced || 0;
    totalWickets += match.wickets || 0;
    totalDotBalls += match.dotBalls || 0;
    totalPoints += match.points || 0;
    if (runs >= 100) innings100s += 1;
    else if (runs >= 50) innings50s += 1;
  });

  return {
    ...player,
    totalRuns,
    totalWickets,
    totalDotBalls,
    totalPoints,
    innings50s,
    innings100s,
    matches: (player.points || []).length,
    sr: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
  };
}

function getRecentTrend(team: DashboardTeam, latestMatchNumber: number) {
  if (latestMatchNumber < 0) {
    return 0;
  }

  return Math.round(
    (team.players || []).reduce((sum, player) => {
      const recentPoints = (player.points || []).reduce((playerSum, entry) => {
        return toMatchNumber(entry.matchId) === latestMatchNumber ? playerSum + (entry.points || 0) : playerSum;
      }, 0);

      return sum + recentPoints;
    }, 0)
  );
}

function buildMovementMap(teams: DashboardTeam[], latestMatchNumber: number) {
  const previousStandings = teams
    .map((team) => {
      const latestMatchPoints = (team.players || []).reduce((sum, player) => {
        return (
          sum +
          (player.points || []).reduce((playerSum, entry) => {
            return toMatchNumber(entry.matchId) === latestMatchNumber ? playerSum + (entry.points || 0) : playerSum;
          }, 0)
        );
      }, 0);

      return {
        teamId: team.id,
        previousPoints: (team.totalPoints || 0) - latestMatchPoints,
      };
    })
    .sort((a, b) => {
      const pointsDelta = b.previousPoints - a.previousPoints;
      if (pointsDelta !== 0) return pointsDelta;
      return a.teamId.localeCompare(b.teamId);
    });

  return new Map(previousStandings.map((entry, index) => [entry.teamId, index + 1]));
}

function createTeamBadges(summary: TeamSummary, movement: number) {
  const badges: TeamBadge[] = [];

  if (summary.rank === 1) badges.push({ label: "Table Topper", tone: "text-amber-300 border-amber-400/25 bg-amber-400/10" });
  if (movement > 0) badges.push({ label: `Up ${movement}`, tone: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10" });
  if (summary.recentTrend >= 75) badges.push({ label: "Form Surge", tone: "text-cyan-200 border-cyan-400/25 bg-cyan-400/10" });
  if (summary.playerCount >= 18) badges.push({ label: "Deep Squad", tone: "text-violet-200 border-violet-400/25 bg-violet-400/10" });
  if (summary.points >= 1000) badges.push({ label: "1000 Club", tone: "text-fuchsia-200 border-fuchsia-400/25 bg-fuchsia-400/10" });

  return badges.slice(0, 3);
}

function findLeader(players: AggregatedPlayer[], pick: (player: AggregatedPlayer) => number) {
  return players.reduce<AggregatedPlayer | null>((best, player) => {
    const value = pick(player);
    if (value <= 0) return best;
    if (!best || value > pick(best)) return player;
    return best;
  }, null);
}

function buildTeamComparisons(topTeams: TeamSummary[]) {
  if (topTeams.length < 2) return [];

  const [leader, challenger, third] = topTeams;
  const comparisons: TeamComparison[] = [
    {
      title: "Title Race",
      summary: `${leader.team.name} lead ${challenger.team.name} by ${Math.round(leader.points - challenger.points)} points.`,
      left: leader,
      right: challenger,
    },
  ];

  if (third) {
    comparisons.push({
      title: "Podium Pressure",
      summary: `${challenger.team.name} hold ${Math.round(challenger.points - third.points)} points over ${third.team.name}.`,
      left: challenger,
      right: third,
    });
  }

  return comparisons;
}

export function deriveLeagueData(
  teams: DashboardTeam[],
  overrides?: {
    orangeCapHolder?: AggregatedPlayer | null;
    purpleCapHolder?: AggregatedPlayer | null;
  }
): LeagueDerivedData {
  const allPlayers = teams.flatMap((team) => team.players || []);
  const aggregatedPlayers = allPlayers.map(aggregatePlayer);
  const activePlayers = aggregatedPlayers.filter((player) => player.totalPoints > 0 || player.totalRuns > 0 || player.totalWickets > 0);

  const pointEntries: ActivityEntry[] = allPlayers.flatMap((player) =>
    (player.points || []).map((entry) => ({
      playerName: player.name,
      teamName: player.user?.name,
      matchId: entry.matchId,
      matchLabel: formatMatchLabel(entry.matchId, "standard", entry.match || null),
      matchMeta: entry.match || null,
      points: entry.points || 0,
      createdAt: entry.createdAt,
    }))
  );

  const latestMatchNumber = Math.max(...pointEntries.map((entry) => toMatchNumber(entry.matchId)), -1);
  const latestMatchId = latestMatchNumber >= 0 ? String(latestMatchNumber) : null;
  const matchMetaById = new Map(
    pointEntries
      .filter((entry) => entry.matchId)
      .map((entry) => [String(entry.matchId), entry.matchMeta || null])
  );
  const previousRanks = buildMovementMap(teams, latestMatchNumber);

  const teamSummaries: TeamSummary[] = teams.map((team, index) => {
    const rank = index + 1;
    const previousRank = previousRanks.get(team.id) || rank;
    const { latestMatch, previousMatch } = getLatestAndPreviousTeamMatches(team);

    return {
      team,
      rank,
      previousRank,
      movement: previousRank - rank,
      points: team.totalPoints || 0,
      playerCount: team.players?.length || 0,
      budget: team.budget || 0,
      topPlayers: getTopPlayers(team.players || [], 11) as DashboardPlayer[],
      recentTrend: latestMatch?.totalPoints || getRecentTrend(team, latestMatchNumber),
      previousTrend: previousMatch?.totalPoints || 0,
      latestMatchLabel: latestMatch?.compactMatchLabel || null,
      previousMatchLabel: previousMatch?.compactMatchLabel || null,
    };
  });

  const topTeams = teamSummaries.slice(0, 3);
  const uniqueMatches = new Set(
    pointEntries
      .map((entry) => entry.matchId)
      .filter((matchId): matchId is string => typeof matchId === "string" && matchId.trim().length > 0)
  );

  const topPlayer = findLeader(activePlayers, (player) => player.totalPoints);
  const topRunScorer = overrides?.orangeCapHolder ?? findLeader(aggregatedPlayers, (player) => player.totalRuns);
  const topWicketTaker = overrides?.purpleCapHolder ?? findLeader(aggregatedPlayers, (player) => player.totalWickets);
  const mostHundreds = findLeader(aggregatedPlayers, (player) => player.innings100s);
  const mostFifties = findLeader(aggregatedPlayers, (player) => player.innings50s);

  const playerLeaders: PlayerLeader[] = [
    {
      label: "Orange Cap Holder",
      statLabel: "Runs",
      statValue: `${topRunScorer?.totalRuns || 0}`,
      accentClass: "from-orange-500/25 to-amber-400/15",
      player: topRunScorer,
    },
    {
      label: "Purple Cap Holder",
      statLabel: "Wickets",
      statValue: `${topWicketTaker?.totalWickets || 0}`,
      accentClass: "from-violet-500/25 to-fuchsia-500/15",
      player: topWicketTaker,
    },
    {
      label: "Most 100s",
      statLabel: "Centuries",
      statValue: `${mostHundreds?.innings100s || 0}`,
      accentClass: "from-cyan-400/20 to-blue-500/15",
      player: mostHundreds,
    },
    {
      label: "Most 50s",
      statLabel: "Half-Centuries",
      statValue: `${mostFifties?.innings50s || 0}`,
      accentClass: "from-emerald-400/20 to-teal-500/15",
      player: mostFifties,
    },
  ];

  const spotlightItems = playerLeaders
    .filter((leader): leader is PlayerLeader & { player: AggregatedPlayer } => Boolean(leader.player))
    .slice(0, 3)
    .map((leader) => ({
      label: leader.label,
      statLabel: leader.statLabel,
      statValue: leader.statValue,
      accentClass: leader.accentClass,
      player: leader.player,
    }));

  const latestActivity = [...pointEntries]
    .sort((a, b) => {
      const timeDelta = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (timeDelta !== 0) return timeDelta;
      return toMatchNumber(b.matchId) - toMatchNumber(a.matchId);
    })
    .slice(0, 8);

  const stats: StatItem[] = [
    { icon: Trophy, label: "Total Teams", value: `${teams.length}`, accent: "from-violet-500/30 to-fuchsia-500/20" },
    { icon: Users, label: "Total Players", value: `${allPlayers.length}`, accent: "from-cyan-400/25 to-sky-500/15" },
    { icon: Swords, label: "Matches Played", value: `${uniqueMatches.size}`, accent: "from-rose-500/25 to-orange-500/20" },
    {
      icon: Crown,
      label: "League Leader",
      value: topTeams[0]?.team.name || "Waiting",
      accent: "from-amber-400/25 to-yellow-500/20",
    },
    {
      icon: Sparkles,
      label: "MVP",
      value: topPlayer ? topPlayer.name : "No scores yet",
      accent: "from-emerald-400/20 to-cyan-400/20",
    },
    {
      icon: Activity,
      label: "League Status",
      value: uniqueMatches.size > 0 ? "Scoring Live" : teams.length > 0 ? "Auction Ready" : "Setup Mode",
      accent: "from-fuchsia-500/20 to-violet-500/25",
    },
  ];

  const matchTimestamps = new Map<string, number>();
  for (const entry of pointEntries) {
    const matchId = String(entry.matchId || "").trim();
    if (!matchId) continue;
    const startedAt = entry.matchMeta?.startedAt ? new Date(String(entry.matchMeta.startedAt)).getTime() : Number.NaN;
    const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : Number.NaN;
    const ts = Number.isFinite(startedAt) ? startedAt : createdAt;
    if (!Number.isFinite(ts)) continue;
    const prev = matchTimestamps.get(matchId);
    if (!prev || ts > prev) {
      matchTimestamps.set(matchId, ts);
    }
  }

  let latestWeek: string | null = null;
  let latestWeekTs = -1;
  for (const [matchId, ts] of matchTimestamps.entries()) {
    const meta = matchMetaById.get(matchId) || null;
    const status = String(meta?.status || "");
    if (status && !/\bwon\b/i.test(status)) {
      continue;
    }
    const key = weekKeyUtc(new Date(ts));
    if (ts > latestWeekTs) {
      latestWeekTs = ts;
      latestWeek = key;
    }
  }

  const weeklyAwards = latestWeek
    ? (() => {
        const weekId = `week:${latestWeek}`;
        const matchesInWeek = [...matchTimestamps.entries()]
          .filter(([matchId, ts]) => {
            const meta = matchMetaById.get(matchId) || null;
            const status = String(meta?.status || "");
            if (status && !/\bwon\b/i.test(status)) {
              return false;
            }
            return weekKeyUtc(new Date(ts)) === latestWeek;
          })
          .map(([matchId]) => matchId);

        const matchLabel = `Week of ${latestWeek}`;
        const compactMatchLabel = matchLabel;

        const totals = aggregatedPlayers
          .map((player) => {
            const entries = (player.points || []).filter((entry) => matchesInWeek.includes(String(entry.matchId || "")));
            if (entries.length === 0) return null;
            return {
              player,
              points: entries.reduce((sum, entry) => sum + (entry.points || 0), 0),
              runs: entries.reduce((sum, entry) => sum + (entry.runs || 0), 0),
              wickets: entries.reduce((sum, entry) => sum + (entry.wickets || 0), 0),
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

        const topPoints = [...totals].sort((a, b) => b.points - a.points)[0];
        const topRuns = [...totals].sort((a, b) => b.runs - a.runs)[0];
        const topWickets = [...totals].sort((a, b) => b.wickets - a.wickets)[0];

        return [
          topPoints
            ? {
                matchId: weekId,
                matchLabel,
                compactMatchLabel,
                title: "Weekly MVP",
                winner: topPoints.player.name,
                teamName: topPoints.player.user?.name,
                value: formatPoints(topPoints.points),
                description: `Best fantasy haul across ${matchesInWeek.length} match${matchesInWeek.length === 1 ? "" : "es"}.`,
              }
            : null,
          topRuns && topRuns.runs > 0
            ? {
                matchId: weekId,
                matchLabel,
                compactMatchLabel,
                title: "Run Machine",
                winner: topRuns.player.name,
                teamName: topRuns.player.user?.name,
                value: `${topRuns.runs} runs`,
                description: `Most runs across ${matchesInWeek.length} match${matchesInWeek.length === 1 ? "" : "es"}.`,
              }
            : null,
          topWickets && topWickets.wickets > 0
            ? {
                matchId: weekId,
                matchLabel,
                compactMatchLabel,
                title: "Strike Bowler",
                winner: topWickets.player.name,
                teamName: topWickets.player.user?.name,
                value: `${topWickets.wickets} wickets`,
                description: `Most wickets across ${matchesInWeek.length} match${matchesInWeek.length === 1 ? "" : "es"}.`,
              }
            : null,
        ].filter((entry): entry is WeeklyAward => Boolean(entry));
      })()
    : [];

  const milestones: Milestone[] = [
    topTeams[0]
      ? {
          title: "Title Pace",
          description: `${topTeams[0].team.name} set the pace with ${Math.round(topTeams[0].points)} total points.`,
          accent: "from-amber-500/20 to-yellow-500/10",
        }
      : null,
    topRunScorer && topRunScorer.totalRuns >= 100
      ? {
          title: "Batting Landmark",
          description: `${topRunScorer.name} has piled up ${topRunScorer.totalRuns} runs this season.`,
          accent: "from-orange-500/20 to-amber-500/10",
        }
      : null,
    topWicketTaker && topWicketTaker.totalWickets >= 5
      ? {
          title: "Bowling Landmark",
          description: `${topWicketTaker.name} leads the attack with ${topWicketTaker.totalWickets} wickets.`,
          accent: "from-violet-500/20 to-fuchsia-500/10",
        }
      : null,
    topPlayer && topPlayer.totalPoints >= 150
      ? {
          title: "Fantasy Landmark",
          description: `${topPlayer.name} has crossed ${Math.round(topPlayer.totalPoints)} fantasy points.`,
          accent: "from-cyan-500/20 to-blue-500/10",
        }
      : null,
  ].filter((entry): entry is Milestone => Boolean(entry));

  const leader = topTeams[0];
  const challenger = topTeams[1];
  const seasonStory = leader
    ? challenger
      ? `${leader.team.name} sit on top of the table, but ${challenger.team.name} remain within ${Math.round(
          leader.points - challenger.points
        )} points. ${topPlayer ? `${topPlayer.name} is driving the fantasy conversation with ${Math.round(topPlayer.totalPoints)} points.` : ""}`
      : `${leader.team.name} have opened up the league lead and set the tone for the season so far.`
    : "The season story will come alive as soon as fantasy points start flowing in.";
  const seasonStoryShort = leader
    ? `${leader.team.name} lead the table${challenger ? ` by ${Math.round(leader.points - challenger.points)} points over ${challenger.team.name}` : ""}.`
    : "The title race opens once scoring begins.";

  const teamBadges = Object.fromEntries(teamSummaries.map((summary) => [summary.team.id, createTeamBadges(summary, summary.movement || 0)]));

  return {
    teams,
    allPlayers,
    aggregatedPlayers,
    activePlayers,
    stats,
    teamSummaries,
    topTeams,
    topPlayer,
    orangeCapHolder: topRunScorer,
    purpleCapHolder: topWicketTaker,
    playerLeaders,
    spotlightItems,
    latestActivity,
    weeklyAwards,
    milestones,
    seasonStory,
    seasonStoryShort,
    leaderboardPreview: teamSummaries.slice(0, 5),
    seasonLeadersPreview: playerLeaders.slice(0, 2),
    recentActivityPreview: latestActivity.slice(0, 4),
    teamComparisons: buildTeamComparisons(topTeams),
    teamBadges,
    latestMatchId,
  };
}

export function getMovementLabel(movement = 0) {
  if (movement > 0) return `Up ${movement}`;
  if (movement < 0) return `Down ${Math.abs(movement)}`;
  return "No Change";
}

export function getTeamById(teams: DashboardTeam[], teamId: string) {
  return teams.find((team) => team.id === teamId) || null;
}

export function getTopPlayersAcrossLeague(players: AggregatedPlayer[], limit = 12) {
  return [...players].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit);
}

export function getTopByMetric(players: AggregatedPlayer[], metric: keyof AggregatedPlayer, limit = 10) {
  return [...players]
    .sort((a, b) => {
      const delta = Number(b[metric] || 0) - Number(a[metric] || 0);
      if (delta !== 0) return delta;
      return b.totalPoints - a.totalPoints;
    })
    .slice(0, limit);
}
