const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDb() {
  try {
    console.log("Starting full database reset...");

    // 1. Wipe all match points
    await prisma.playerPoints.deleteMany({});
    console.log("Wiped all live match points.");

    // 2. Reset all players to pristine unsold condition
    await prisma.player.updateMany({
      data: {
        userId: null,
        auctionPrice: null,
        acquisition: null
      }
    });
    console.log("All 249 IPL Players successfully restored to Unsold status.");

    // 3. Clear the Live Auction Stage
    await prisma.auctionState.update({
      where: { id: "global" },
      data: {
        currentPlayerId: null,
        highestBidderId: null,
        highestBid: 0,
        endTime: null
      }
    });
    console.log("Live room stage successfully emptied.");

    // 4. Delete all competing users except the Gamemaster (if exists)
    await prisma.user.deleteMany({
      where: {
        name: { not: "admin" }
      }
    });

    // Make sure 'admin' exists
    const adminExists = await prisma.user.findUnique({ where: { name: "admin" } });
    if (!adminExists) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash("admin123", 10);
      await prisma.user.create({
        data: {
          name: "admin",
          password: hash,
        }
      });
      console.log("Admin account created! Password is: admin123");
    } else {
      console.log("Admin account preserved.");
    }

    console.log("Franchises deleted! The arena is completely pristine.");

  } catch (e) {
    console.error("Reset failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

resetDb();
