const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// We'll read the team mapping if it exists or use the one from playerIndex
async function sync() {
  const players = await prisma.player.findMany();
  
  // Since we can't easily import TS files in a simple node script without ts-node
  // We'll use the CSV/Excel data or the JSON we created earlier
  let mapping = {};
  if (fs.existsSync('./player_teams.json')) {
    mapping = JSON.parse(fs.readFileSync('./player_teams.json', 'utf8'));
  }

  console.log(`Syncing ${players.length} players...`);
  let updated = 0;
  for (const p of players) {
    const team = mapping[p.name];
    if (team) {
      await prisma.player.update({
        where: { id: p.id },
        data: { iplTeam: team }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} players with IPL team info.`);
}

sync().catch(console.error).finally(() => prisma.$disconnect());
