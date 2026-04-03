const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`DELETE FROM MatchSyncState WHERE syncKey = 'auto-live-match';`);
  console.log('Sync state cleared.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
