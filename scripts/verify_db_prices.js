const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.findMany();
  const distribution = {};
  
  players.forEach(p => {
    const bp = p.basePrice || 'None';
    distribution[bp] = (distribution[bp] || 0) + 1;
  });

  console.log('Final Base Price Distribution:');
  console.log(distribution);

  console.log('\nSample Players in each category:');
  for (const bp in distribution) {
      const sample = players.filter(p => p.basePrice === bp).slice(0, 3).map(p => p.name).join(', ');
      console.log(`${bp}: ${sample}...`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
