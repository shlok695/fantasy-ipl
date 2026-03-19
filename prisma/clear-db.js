const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Clearing points and users, resetting players...");

  // 1. Delete all PlayerPoints
  await prisma.playerPoints.deleteMany({});
  console.log("Deleted all player points.");

  // 2. Clear Player assignments
  await prisma.player.updateMany({
    data: {
      userId: null,
      auctionPrice: null
    }
  });
  console.log("Reset all player auction statuses.");

  // 3. Delete all Users (Teams)
  await prisma.user.deleteMany({});
  console.log("Deleted all teams/users.");

  console.log("Database reset complete. Players have been kept.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
