const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getTableColumns(tableName) {
  return prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
}

async function hasColumn(tableName, columnName) {
  const columns = await getTableColumns(tableName);
  return columns.some((column) => column.name === columnName);
}

async function hasIndex(indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type = 'index' AND name = ? LIMIT 1`,
    indexName
  );
  return rows.length > 0;
}

async function hasTable(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
    tableName
  );
  return rows.length > 0;
}

async function addColumnIfMissing(tableName, columnName, sqlType, extra = '') {
  const exists = await hasColumn(tableName, columnName);
  if (exists) {
    console.log(`- ${tableName}.${columnName} already exists`);
    return;
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${sqlType} ${extra}`.trim()
  );
  console.log(`+ Added ${tableName}.${columnName}`);
}

async function createIndexIfMissing(indexName, createSql) {
  const exists = await hasIndex(indexName);
  if (exists) {
    console.log(`- Index ${indexName} already exists`);
    return;
  }

  await prisma.$executeRawUnsafe(createSql);
  console.log(`+ Created index ${indexName}`);
}

async function createAuditTableIfMissing() {
  const exists = await hasTable('AdminAuditLog');
  if (exists) {
    console.log(`- Table AdminAuditLog already exists`);
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "AdminAuditLog" (
      "id" TEXT PRIMARY KEY,
      "actor" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log(`+ Created table AdminAuditLog`);
}

async function ensureAuctionStateRow() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id FROM "AuctionState" WHERE id = 'global' LIMIT 1`
  );

  if (rows.length > 0) {
    console.log(`- AuctionState.global already exists`);
    return;
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "AuctionState" ("id", "highestBid", "status", "readyTeams", "liveRoomVisible")
    VALUES ('global', 0, 'WAITING', NULL, 0)
  `);
  console.log(`+ Created AuctionState.global row`);
}

async function main() {
  console.log('Starting database upgrade...');

  await addColumnIfMissing('User', 'captainId', 'TEXT');
  await addColumnIfMissing('User', 'viceCaptainId', 'TEXT');
  await addColumnIfMissing('AuctionState', 'liveRoomVisible', 'BOOLEAN', 'DEFAULT 0');

  await createIndexIfMissing(
    'User_captainId_key',
    `CREATE UNIQUE INDEX "User_captainId_key" ON "User" ("captainId") WHERE "captainId" IS NOT NULL`
  );
  await createIndexIfMissing(
    'User_viceCaptainId_key',
    `CREATE UNIQUE INDEX "User_viceCaptainId_key" ON "User" ("viceCaptainId") WHERE "viceCaptainId" IS NOT NULL`
  );

  await prisma.$executeRawUnsafe(
    `UPDATE "AuctionState" SET "liveRoomVisible" = 0 WHERE "liveRoomVisible" IS NULL`
  );
  console.log(`+ Backfilled AuctionState.liveRoomVisible defaults`);

  await createAuditTableIfMissing();
  await ensureAuctionStateRow();

  console.log('Database upgrade complete.');
}

main()
  .catch((error) => {
    console.error('Database upgrade failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
