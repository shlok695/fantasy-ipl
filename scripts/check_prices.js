const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.findMany({
    select: { name: true, basePrice: true, role: true }
  });
  
  const withoutPrice = players.filter(p => !p.basePrice);
  
  console.log('\n💰 Base Price Check:');
  console.log(`  Total players: ${players.length}`);
  console.log(`  With base price: ${players.length - withoutPrice.length}`);
  console.log(`  Missing base price: ${withoutPrice.length}`);
  
  if (withoutPrice.length > 0) {
    console.log('\n⚠️  Players WITHOUT base price:');
    withoutPrice.forEach(p => {
      console.log(`  • ${p.name} (${p.role})`);
    });
  } else {
    console.log('\n✅ All players have base prices!');
  }
  
  // Price distribution
  const priceMap = {};
  players.forEach(p => {
    const price = p.basePrice || 'NULL';
    priceMap[price] = (priceMap[price] || 0) + 1;
  });
  
  console.log('\n📊 Price Distribution:');
  Object.entries(priceMap)
    .sort((a, b) => {
      const aVal = parseFloat(a[0]) || 0;
      const bVal = parseFloat(b[0]) || 0;
      return bVal - aVal;
    })
    .forEach(([price, count]) => {
      console.log(`  ${price} Cr: ${count} players`);
    });
  
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
