const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching players to clean...");
  const players = await prisma.player.findMany();
  
  let count = 0;
  for (const player of players) {
    let newName = player.name;
    let country = null;

    // e.g. "Dewald Brevis* (SA)" or "Jamie Overton (ENG)"
    
    // 1. Extract country inside brackets anywhere in the name
    const match = newName.match(/\((.*?)\)/);
    if (match) {
      country = match[1];
    }

    // 2. Remove the bracketed text completely
    newName = newName.replace(/\(.*?\)/g, '');

    // 3. Remove asterisks
    newName = newName.replace(/\*/g, '');

    // 4. Trim extra spaces
    newName = newName.trim();

    if (newName !== player.name || country) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          name: newName,
          country: country
        }
      });
      count++;
    }
  }

  console.log(`Successfully cleaned ${count} player records!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
