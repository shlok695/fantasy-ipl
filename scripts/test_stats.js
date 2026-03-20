const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const remainingPlayers = await prisma.player.findMany({
    where: { userId: null },
    select: { role: true, country: true }
  });

  const stats = {
    roles: { Batter: 0, Bowler: 0, 'All-Rounder': 0, Wicketkeeper: 0 },
    countries: {},
    totalRemaining: remainingPlayers.length,
  };

  remainingPlayers.forEach(p => {
    if (p.role) {
      const r = p.role.toLowerCase();
      if (r.includes('batter')) stats.roles.Batter++;
      else if (r.includes('bowler')) stats.roles.Bowler++;
      else if (r.includes('all-rounder')) stats.roles['All-Rounder']++;
      else if (r.includes('wicketkeeper')) stats.roles.Wicketkeeper++;
    }
    if (p.country) {
      stats.countries[p.country] = (stats.countries[p.country] || 0) + 1;
    }
  });

  console.log('Auction Stats Verification:');
  console.log(JSON.stringify(stats, null, 2));
}

main().finally(() => prisma.$disconnect());
