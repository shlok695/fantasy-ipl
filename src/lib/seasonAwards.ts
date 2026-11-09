type PlayerWithPoints = {
  id: string;
  name: string;
  userId: string | null;
  user?: {
    name?: string | null;
  } | null;
  points?: Array<{
    points?: number;
    runs?: number;
    wickets?: number;
    breakdownJson?: string | null;
    multiplierValue?: number | null;
  }>;
};

type AwardWinner = {
  award: "orangeCap" | "purpleCap" | "trueMvp";
  label: string;
  playerId: string;
  playerName: string;
  userId: string;
  franchiseName: string;
  statValue: number;
};

export type SeasonAwardWinner = AwardWinner;

type PlayerPointsBreakdown = {
  subtotal?: unknown;
  multiplierValue?: unknown;
};

function sumMetric(player: PlayerWithPoints, metric: "points" | "runs" | "wickets") {
  return (player.points || []).reduce((sum, entry) => sum + (entry?.[metric] || 0), 0);
}

function toFiniteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBreakdownJson(value: string | null | undefined): PlayerPointsBreakdown | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as PlayerPointsBreakdown;
  } catch {
    return null;
  }
}

function getRawFantasyPointsFromEntry(entry: NonNullable<PlayerWithPoints["points"]>[number]) {
  const breakdown = parseBreakdownJson(entry.breakdownJson);
  const subtotal = toFiniteNumber(breakdown?.subtotal);
  if (subtotal !== null) {
    return subtotal;
  }

  const points = entry.points || 0;
  const multiplierValue = toFiniteNumber(breakdown?.multiplierValue ?? entry.multiplierValue);
  if (multiplierValue !== null && multiplierValue !== 0) {
    return points / multiplierValue;
  }

  return points;
}

function sumRawFantasyPoints(player: PlayerWithPoints) {
  return (player.points || []).reduce((sum, entry) => sum + getRawFantasyPointsFromEntry(entry), 0);
}

function pickLeader(
  players: PlayerWithPoints[],
  metric: "points" | "runs" | "wickets",
  tieBreaker?: "points" | "runs"
) {
  return [...players]
    .map((player) => ({
      player,
      metricValue: sumMetric(player, metric),
      tieBreakerValue: tieBreaker ? sumMetric(player, tieBreaker) : 0,
    }))
    .sort((left, right) => {
      const metricDelta = right.metricValue - left.metricValue;
      if (metricDelta !== 0) return metricDelta;

      if (tieBreaker) {
        const tieBreakerDelta = right.tieBreakerValue - left.tieBreakerValue;
        if (tieBreakerDelta !== 0) return tieBreakerDelta;
      }

      return left.player.name.localeCompare(right.player.name) || left.player.id.localeCompare(right.player.id);
    })[0];
}

function pickTrueMvp(players: PlayerWithPoints[]) {
  return [...players]
    .map((player) => ({
      player,
      metricValue: sumRawFantasyPoints(player),
      tieBreakerValue: sumMetric(player, "runs"),
    }))
    .sort((left, right) => {
      const metricDelta = right.metricValue - left.metricValue;
      if (metricDelta !== 0) return metricDelta;

      const tieBreakerDelta = right.tieBreakerValue - left.tieBreakerValue;
      if (tieBreakerDelta !== 0) return tieBreakerDelta;

      return left.player.name.localeCompare(right.player.name) || left.player.id.localeCompare(right.player.id);
    })[0];
}

export function getSeasonAwardWinners(players: PlayerWithPoints[]): AwardWinner[] {
  const eligiblePlayers = players.filter((player) => Boolean(player.userId));
  if (eligiblePlayers.length === 0) {
    return [];
  }

  const orangeCap = pickLeader(eligiblePlayers, "runs");
  const purpleCap = pickLeader(eligiblePlayers, "wickets");
  const trueMvp = pickTrueMvp(eligiblePlayers);

  return [
    orangeCap
      ? {
          award: "orangeCap",
          label: "Orange Cap",
          playerId: orangeCap.player.id,
          playerName: orangeCap.player.name,
          userId: orangeCap.player.userId!,
          franchiseName: orangeCap.player.user?.name || "Unknown Franchise",
          statValue: orangeCap.metricValue,
        }
      : null,
    purpleCap
      ? {
          award: "purpleCap",
          label: "Purple Cap",
          playerId: purpleCap.player.id,
          playerName: purpleCap.player.name,
          userId: purpleCap.player.userId!,
          franchiseName: purpleCap.player.user?.name || "Unknown Franchise",
          statValue: purpleCap.metricValue,
        }
      : null,
    trueMvp
      ? {
          award: "trueMvp",
          label: "True MVP",
          playerId: trueMvp.player.id,
          playerName: trueMvp.player.name,
          userId: trueMvp.player.userId!,
          franchiseName: trueMvp.player.user?.name || "Unknown Franchise",
          statValue: trueMvp.metricValue,
        }
      : null,
  ].filter((winner): winner is AwardWinner => Boolean(winner));
}

export function getSeasonAwardBonusByTeam(winners: SeasonAwardWinner[]) {
  return winners.reduce<Map<string, number>>((accumulator, winner) => {
    accumulator.set(winner.userId, (accumulator.get(winner.userId) || 0) + 500);
    return accumulator;
  }, new Map());
}

export function formatSeasonAwardAuditDetails(winners: SeasonAwardWinner[]) {
  return winners.map((winner) => `${winner.label}:${winner.playerName}->${winner.franchiseName}(+500)`).join(' | ');
}
