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
  // 0. Protection: Only push if we are NOT already bidding (unless forced, but here we want safe auto)
  const currentState = await prisma.auctionState.findUnique({ where: { id: "global" } });
  if (currentState && currentState.status === "BIDDING") {
    console.log(`[Auction Engine] Already BIDDING - skipping push`);
    return false;
  }

  // 1. Find all completely untouched players
  const untouched = await prisma.player.findMany({
    where: {
      userId: null,
      acquisition: null,
      role: { not: 'IPL TEAM' } // Ensure we only pick players randomly, not franchise entities
    }
  });

  console.log(`[Auction Engine] Found ${untouched.length} untouched players.`);
  
  if (untouched.length === 0) {
    console.log(`[Auction Engine] No players left. Checking for any players in DB...`);
    const allPlayers = await prisma.player.findMany({ select: { name: true, role: true, userId: true, acquisition: true } });
    console.log(`[Auction Engine] Total players in DB: ${allPlayers.length}`);
    if (allPlayers.length > 0) {
      console.log(`[Auction Engine] Sample players: `, allPlayers.slice(0, 5).map(p => ({ name: p.name, role: p.role, sold: !!p.userId, acquired: p.acquisition })));
    }
    
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

  // Fisher-Yates shuffle to ensure the "first" result is unpredictable
  for (let i = untouched.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [untouched[i], untouched[j]] = [untouched[j], untouched[i]];
  }

  // 2. Determine target Set (either explicit or globally active)
  let targetSet = explicitSet;
  let nextPlayer = null;

  // 3. Try to pull a random player from the locked Target Set if provided
  if (targetSet) {
    const availableInTarget = untouched.filter(p => 
      p.type?.includes(targetSet!.type) && 
      p.role?.includes(targetSet!.role)
    );
    console.log(`[Auction Engine] Target Set: ${targetSet.type} ${targetSet.role}. Found ${availableInTarget.length} players.`);
    if (availableInTarget.length > 0) {
      nextPlayer = availableInTarget[Math.floor(Math.random() * availableInTarget.length)];
    }
  }

  // 4. Default/Random behavior: If no explicit category is selected, pick a completely random player from everything left!
  if (!nextPlayer) {
    const randomIndex = Math.floor(Math.random() * untouched.length);
    nextPlayer = untouched[randomIndex];
    console.log(`[Auction Engine] Picking random player: ${nextPlayer.name} (type: ${nextPlayer.type}, role: ${nextPlayer.role})`);
  }

  if (!nextPlayer) {
    console.error(`[Auction Engine] CRITICAL: nextPlayer is null after selection logic`);
    return false;
  }

  // 4. Push to the Live Stage
  console.log(`[Auction Engine] Pushing ${nextPlayer.name} to the stage...`);
  const basePrice = nextPlayer.basePrice ? parseFloat(nextPlayer.basePrice.replace(/[^0-9.]/g, '')) || 2.0 : 2.0;
  console.log(`[Auction Engine] Base price for ${nextPlayer.name}: ₹${basePrice} Cr`);
  
  await prisma.auctionState.update({
    where: { id: "global" },
    data: {
      currentPlayerId: nextPlayer.id,
      highestBid: basePrice,
      highestBidderId: null,
      status: "BIDDING",
      readyTeams: "",
      updatedAt: new Date()
    }
  });
  
  console.log(`[Auction Engine] ✓ Successfully pushed ${nextPlayer.name} to live stage`);
  return true;
}
