import { prisma } from './prisma';

export const AUCTION_SETS = [
  { type: 'Capped', role: 'Batter' },
  { type: 'Capped', role: 'All-rounder' },
  { type: 'Capped', role: 'Wicketkeeper' },
  { type: 'Capped', role: 'Bowler' },
  { type: 'Uncapped', role: 'Batter' },
  { type: 'Uncapped', role: 'All-rounder' },
  { type: 'Uncapped', role: 'Wicketkeeper' },
  { type: 'Uncapped', role: 'Bowler' },
  // Fallbacks for data inconsistencies
  { type: 'Overseas', role: 'Batter' },
  { type: 'Overseas', role: 'All-rounder' },
  { type: 'Overseas', role: 'Wicketkeeper' },
  { type: 'Overseas', role: 'Bowler' },
];

export async function pushNextPlayer(explicitSet?: { type: string, role: string }) {
  // 1. Find all completely untouched players
  const untouched = await prisma.player.findMany({
    where: {
      userId: null,
      acquisition: null
    }
  });

  if (untouched.length === 0) {
    // Auction is completely over
    await prisma.auctionState.update({
      where: { id: "global" },
      data: {
        currentPlayerId: null,
        highestBid: 0,
        highestBidderId: null,
        status: "WAITING",
        readyTeams: null
      }
    });
    return false;
  }

  // 2. Determine target Set (either explicit or globally active)
  let targetSet = explicitSet;
  if (!targetSet) {
    const globalState = await prisma.auctionState.findUnique({ where: { id: "global" }, include: { player: true } });
    if (globalState?.player) {
      targetSet = { type: globalState.player.type || "", role: globalState.player.role || "" };
    }
  }

  let nextPlayer = null;

  // 3. Try to pull a random player from the locked Target Set
  if (targetSet) {
    const availableInTarget = untouched.filter(p => 
      p.type?.includes(targetSet!.type) && 
      p.role?.includes(targetSet!.role)
    );
    if (availableInTarget.length > 0) {
      nextPlayer = availableInTarget[Math.floor(Math.random() * availableInTarget.length)];
    }
  }

  // 4. Fallback sequence: If no target set, or target set is completely empty, sequentially find the next populated Set
  if (!nextPlayer) {
    for (const set of AUCTION_SETS) {
      const availableInSet = untouched.filter(p => 
        p.type?.includes(set.type) && 
        p.role?.includes(set.role)
      );

      if (availableInSet.length > 0) {
        // Pick a completely random player from this specific Set!
        const randomIndex = Math.floor(Math.random() * availableInSet.length);
        nextPlayer = availableInSet[randomIndex];
        break;
      }
    }
  }

  // 5. Ultimate Fallback: If no defined sets matched the remaining players, pick a random one
  if (!nextPlayer) {
    const randomIndex = Math.floor(Math.random() * untouched.length);
    nextPlayer = untouched[randomIndex];
  }

  // 4. Push to the Live Stage
  await prisma.auctionState.update({
    where: { id: "global" },
    data: {
      currentPlayerId: nextPlayer.id,
      highestBid: nextPlayer.basePrice ? parseFloat(nextPlayer.basePrice.replace(/[^0-9.]/g, '')) || 2.0 : 2.0, // Default to base price or 2.0
      highestBidderId: null,
      status: "BIDDING",
      readyTeams: "" // Reset ready tracker for the new round
    }
  });

  return true;
}
