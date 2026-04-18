import type { DashboardPlayer, PlayerPointEntry } from "@/components/dashboard/types";

type PlayerWithPoints = Pick<DashboardPlayer, "name" | "auctionPrice" | "points">;

export function getPlayerTotalPoints(player: PlayerWithPoints) {
  return (player.points || []).reduce((sum: number, entry: PlayerPointEntry) => {
    return sum + (entry?.points || 0);
  }, 0);
}

export function sortPlayersByPoints<T extends PlayerWithPoints>(players: T[] = []) {
  return [...players].sort((a, b) => {
    const pointDelta = getPlayerTotalPoints(b) - getPlayerTotalPoints(a);

    if (pointDelta !== 0) {
      return pointDelta;
    }

    const priceDelta = (b?.auctionPrice || 0) - (a?.auctionPrice || 0);
    if (priceDelta !== 0) {
      return priceDelta;
    }

    return (a?.name || "").localeCompare(b?.name || "");
  });
}

export function getTopPlayers<T extends PlayerWithPoints>(players: T[] = [], limit = 11) {
  return sortPlayersByPoints(players).slice(0, limit);
}
