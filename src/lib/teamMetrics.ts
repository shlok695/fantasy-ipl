export function getPlayerTotalPoints(player: any) {
  return (player?.points || []).reduce((sum: number, entry: any) => {
    return sum + (entry?.points || 0);
  }, 0);
}

export function sortPlayersByPoints(players: any[] = []) {
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

export function getTopPlayers(players: any[] = [], limit = 11) {
  return sortPlayersByPoints(players).slice(0, limit);
}
