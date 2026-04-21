import { prisma } from '@/lib/prisma';

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return false;
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function isMissingDatabaseUrlError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('Environment variable not found: DATABASE_URL')
  );
}

function isMissingAuctionStateTableError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('no such table: AuctionState')
  );
}

export async function getLiveRoomVisible() {
  if (!hasDatabaseUrl()) {
    return false;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ liveRoomVisible: unknown }>>(
      `SELECT liveRoomVisible FROM "AuctionState" WHERE id = 'global' LIMIT 1`
    );

    if (!rows.length) {
      return false;
    }

    return toBoolean(rows[0].liveRoomVisible);
  } catch (error) {
    if (isMissingDatabaseUrlError(error) || isMissingAuctionStateTableError(error)) {
      return false;
    }

    throw error;
  }
}

export async function setLiveRoomVisible(visible: boolean) {
  if (!hasDatabaseUrl()) {
    throw new Error('DATABASE_URL is not configured.');
  }

  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "AuctionState" ("id", "highestBid", "status", "liveRoomVisible") VALUES ('global', 0, 'WAITING', ${visible ? 1 : 0})`
  );

  await prisma.$executeRawUnsafe(
    `UPDATE "AuctionState" SET "liveRoomVisible" = ${visible ? 1 : 0} WHERE "id" = 'global'`
  );

  return visible;
}
