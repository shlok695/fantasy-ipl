const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const readline = require('readline');

const prisma = new PrismaClient();

async function main() {
  const filePath = 'e:/auction/IPL_Auction_2026_Sold_Player.csv';
  console.log(`Reading from ${filePath}`);
  
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let count = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    
    // Split line parsing CSV properly ignoring commas inside quotes if needed, 
    // but simple split is ok if data has no complex quotes.
    // The data we saw earlier didn't seem to have complex quotes.
    const parts = line.split(',');
    if (parts.length < 6) continue;
    
    const number = parseInt(parts[0], 10) || null;
    const name = parts[1]?.trim();
    const acquisition = parts[2]?.trim();
    const type = parts[3]?.trim();
    const role = parts[4]?.trim();
    const basePrice = parts[5]?.trim();

    if (!name) continue;

    await prisma.player.create({
      data: {
        number,
        name,
        acquisition,
        type,
        role,
        basePrice,
      }
    });
    count++;
  }
  
  console.log(`Successfully seeded ${count} players!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
