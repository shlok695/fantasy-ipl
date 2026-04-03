const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check total players
  const totalPlayers = await prisma.player.count();
  console.log(`\n📊 Total players in DB: ${totalPlayers}`);

  // Get all players with their status
  const players = await prisma.player.findMany({
    select: { name: true, userId: true, acquisition: true, role: true, basePrice: true }
  });

  // Categorize
  const sold = players.filter(p => p.userId).length;
  const unsold = players.filter(p => p.acquisition === 'Unsold').length;
  const pending = players.filter(p => !p.userId && !p.acquisition).length;
  const teams = players.filter(p => p.role === 'IPL TEAM').length;

  console.log(`\n📈 Player Status:`);
  console.log(`  ✅ Sold (have userId): ${sold}`);
  console.log(`  ❌ Unsold (acquisition='Unsold'): ${unsold}`);
  console.log(`  ⏳ Pending (no userId, no acquisition): ${pending}`);
  console.log(`  👥 IPL Teams (role='IPL TEAM'): ${teams}`);

  // Check eligible for auction
  const eligible = players.filter(p => !p.userId && !p.acquisition && p.role !== 'IPL TEAM');
  console.log(`\n🎯 Eligible for auction (userId=null && acquisition=null && role!='IPL TEAM'): ${eligible.length}`);

  if (eligible.length > 0) {
    console.log(`\n✨ First 5 eligible players:`);
    eligible.slice(0, 5).forEach(p => {
      console.log(`  • ${p.name} (${p.type} ${p.role}) - ₹${p.basePrice || 'N/A'}`);
    });
  } else {
    console.log(`\n⚠️  No eligible players! All players either:
  1. Have a userId (already assigned)
  2. Have acquisition status (Unsold/other)
  3. Are IPL TEAM role`);

    // Show sample of each category
    console.log(`\n📋 Sample players by status:`);
    const sold_samples = players.filter(p => p.userId).slice(0, 3);
    if (sold_samples.length > 0) {
      console.log(`  Sold: ${sold_samples.map(p => p.name).join(', ')}`);
    }
    const unsold_samples = players.filter(p => p.acquisition === 'Unsold').slice(0, 3);
    if (unsold_samples.length > 0) {
      console.log(`  Unsold: ${unsold_samples.map(p => p.name).join(', ')}`);
    }
  }

  // Check AuctionState
  const auctionState = await prisma.auctionState.findUnique({
    where: { id: 'global' },
    include: { player: true, highestBidder: true }
  });
  console.log(`\n🔴 Current Auction State:`);
  console.log(`  Status: ${auctionState?.status}`);
  console.log(`  Current Player: ${auctionState?.player?.name || 'None'}`);
  console.log(`  Highest Bid: ₹${auctionState?.highestBid} Cr`);
  console.log(`  Highest Bidder: ${auctionState?.highestBidder?.name || 'None'}`);

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
