const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const VALID_ACQUISITIONS = new Set(['Retained', 'Trade', 'Auction']);
const TRADE_BASE_PRICES = {
  'Ravindra Jadeja': 7.0,
  'Sam Curran': 6.5,
  'Sanju Samson': 8.0,
  'Donovan Ferreira': 1.5,
  'Nitish Rana': 3.0,
  'Arjun Tendulkar': 1.0,
  'Mayank Markande': 1.5,
  'Mohammed Shami': 6.0,
  'Shardul Thakur': 3.5,
  'Sherfane Rutherford': 2.5,
};

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePriceToCrores(rawPrice) {
  const price = cleanText(rawPrice);
  if (!price || price === '-') return null;

  const numericValue = parseFloat(price.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(numericValue)) return null;

  if (/lakh/i.test(price)) {
    return Number((numericValue / 100).toFixed(2));
  }

  return Number(numericValue.toFixed(2));
}

function formatPriceInCrores(price) {
  return `${price.toFixed(2)} Cr`;
}

function normalizeRow(row) {
  let acquisition = cleanText(row['Acquisition']);
  let type = cleanText(row['Type']);
  const role = cleanText(row['Role']);

  // Some spreadsheet rows have Acquisition and Type swapped.
  if (VALID_ACQUISITIONS.has(type) && !VALID_ACQUISITIONS.has(acquisition)) {
    [acquisition, type] = [type, acquisition];
  }

  // A few rows duplicate the role into Type and push the player Type into Acquisition.
  if (!VALID_ACQUISITIONS.has(acquisition) && !VALID_ACQUISITIONS.has(type) && type && role && type === role) {
    acquisition = 'Auction';
    type = cleanText(row['Acquisition']);
  }

  return {
    acquisition: acquisition || null,
    type: type || null,
  };
}

function resolveBasePrice(name, acquisition, rawPrice) {
  const price = parsePriceToCrores(rawPrice);

  // 1. Top Tier: Retained, Trade, or Sold for >= 10 Cr
  if (acquisition === 'Retained' || acquisition === 'Trade' || (price !== null && price >= 10)) {
    return "2.00 Cr";
  }

  // 2. Star Tier: Sold for 5 - 10 Cr
  if (price !== null && price >= 5) {
    return "1.00 Cr";
  }

  // 3. Regular Tier: Sold for 1.5 - 5 Cr
  if (price !== null && price >= 1.5) {
    return "0.50 Cr";
  }

  // 4. Entry Tier: Sold for < 1.5 Cr or No Price
  return "0.20 Cr";
}

async function main() {
  const filePath = 'e:/auction/auction_db_final.xlsx';
  console.log(`Reading from ${filePath}`);

  // Clear existing players to avoid duplicates
  console.log("Clearing existing players...");
  await prisma.player.deleteMany({});
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

    const { acquisition, type } = normalizeRow(row);
    const role = row['Role']?.trim() || null;
    const basePrice = resolveBasePrice(name, acquisition, row['Price']);
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
      },
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
