const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  const filePath = 'e:/auction/auction_db_final.xlsx';
  console.log(`Reading from ${filePath}`);
  
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  let count = 0;

  for (const row of data) {
    const number = row['No.'] ? parseInt(row['No.'], 10) : null;
    const rawName = row['Player']?.trim();
    if (!rawName) continue;

    // Clean player name: strip everything from * onwards (removes * (SA), * (AUS) etc.)
    const name = rawName.replace(/\*.*/g, '').trim();

    const acquisition = row['Acquisition']?.trim() || null;
    const type = row['Type']?.trim() || null;
    const role = row['Role']?.trim() || null;
    const basePrice = row['Price']?.trim() || null;
    const country = row['Nationality']?.trim() || null;

    await prisma.player.create({
      data: {
        number,
        name,
        country,
        acquisition,
        type,
        role,
        basePrice,
      }
    });
    count++;
  }
  
  console.log(`Successfully seeded ${count} players from auction_db_final.xlsx!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
