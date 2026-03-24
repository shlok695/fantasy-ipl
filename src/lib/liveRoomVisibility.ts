import { prisma } from '@/lib/prisma';

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return false;
}

export async function getLiveRoomVisible() {
  const rows = await prisma.$queryRawUnsafe<Array<{ liveRoomVisible: unknown }>>(
    `SELECT liveRoomVisible FROM "AuctionState" WHERE id = 'global' LIMIT 1`
  );

  if (!rows.length) {
    return false;
  }

  return toBoolean(rows[0].liveRoomVisible);
}

export async function setLiveRoomVisible(visible: boolean) {
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "AuctionState" ("id", "highestBid", "status", "liveRoomVisible") VALUES ('global', 0, 'WAITING', ${visible ? 1 : 0})`
  );

  await prisma.$executeRawUnsafe(
    `UPDATE "AuctionState" SET "liveRoomVisible" = ${visible ? 1 : 0} WHERE "id" = 'global'`
  );

  return visible;
}
