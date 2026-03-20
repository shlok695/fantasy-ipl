const { PrismaClient } = require('@prisma/client');

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

function normalizePlayer(player) {
  let acquisition = cleanText(player.acquisition);
  let type = cleanText(player.type);
  const role = cleanText(player.role);

  if (VALID_ACQUISITIONS.has(type) && !VALID_ACQUISITIONS.has(acquisition)) {
    [acquisition, type] = [type, acquisition];
  }

  if (!VALID_ACQUISITIONS.has(acquisition) && !VALID_ACQUISITIONS.has(type) && type && role && type === role) {
    acquisition = 'Auction';
    type = cleanText(player.acquisition);
  }

  let basePrice = formatPriceInCrores(parsePriceToCrores(player.basePrice) ?? 2.0);

  if (acquisition === 'Retained') {
    basePrice = formatPriceInCrores(2.0);
  } else if (acquisition === 'Trade') {
    basePrice = formatPriceInCrores(TRADE_BASE_PRICES[player.name] ?? 2.0);
  }

  return {
    acquisition: acquisition || null,
    type: type || null,
    basePrice,
  };
}

async function main() {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      acquisition: true,
      type: true,
      role: true,
      basePrice: true,
    },
  });

  let updatedCount = 0;

  for (const player of players) {
    const nextValues = normalizePlayer(player);

    if (
      nextValues.acquisition !== player.acquisition ||
      nextValues.type !== player.type ||
      nextValues.basePrice !== player.basePrice
    ) {
      await prisma.player.update({
        where: { id: player.id },
        data: nextValues,
      });
      updatedCount += 1;
    }
  }

  console.log(`Updated ${updatedCount} players.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
