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
  }>;
};

type AwardWinner = {
  award: "orangeCap" | "purpleCap" | "mostValuablePlayer";
  label: string;
  playerId: string;
  playerName: string;
  userId: string;
  franchiseName: string;
  statValue: number;
};

export type SeasonAwardWinner = AwardWinner;

function sumMetric(player: PlayerWithPoints, metric: "points" | "runs" | "wickets") {
  return (player.points || []).reduce((sum, entry) => sum + (entry?.[metric] || 0), 0);
}

function pickLeader(players: PlayerWithPoints[], metric: "points" | "runs" | "wickets", tieBreaker: "points" | "runs") {
  return [...players]
    .map((player) => ({
      player,
      metricValue: sumMetric(player, metric),
      tieBreakerValue: sumMetric(player, tieBreaker),
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

  const orangeCap = pickLeader(eligiblePlayers, "runs", "points");
  const purpleCap = pickLeader(eligiblePlayers, "wickets", "points");
  const mvp = pickLeader(eligiblePlayers, "points", "runs");

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
    mvp
      ? {
          award: "mostValuablePlayer",
          label: "Most Valuable Player",
          playerId: mvp.player.id,
          playerName: mvp.player.name,
          userId: mvp.player.userId!,
          franchiseName: mvp.player.user?.name || "Unknown Franchise",
          statValue: mvp.metricValue,
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
