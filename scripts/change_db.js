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

async function createSimulationBatchTableIfMissing() {
  const exists = await hasTable('SimulationBatch');
  if (exists) {
    console.log(`- Table SimulationBatch already exists`);
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "SimulationBatch" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "label" TEXT NOT NULL,
      "sourceSeason" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log(`+ Created table SimulationBatch`);
}

async function createSimulationTeamBonusAdjustmentTableIfMissing() {
  const exists = await hasTable('SimulationTeamBonusAdjustment');
  if (exists) {
    console.log(`- Table SimulationTeamBonusAdjustment already exists`);
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "SimulationTeamBonusAdjustment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "simulationBatchId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "matchId" TEXT,
      "iplTeam" TEXT,
      "points" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SimulationTeamBonusAdjustment_simulationBatchId_fkey"
        FOREIGN KEY ("simulationBatchId") REFERENCES "SimulationBatch" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "SimulationTeamBonusAdjustment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  console.log(`+ Created table SimulationTeamBonusAdjustment`);
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
  await addColumnIfMissing('PlayerPoints', 'simulationBatchId', 'TEXT');

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
  await createSimulationBatchTableIfMissing();
  await createSimulationTeamBonusAdjustmentTableIfMissing();

  await createIndexIfMissing(
    'PlayerPoints_simulationBatchId_idx',
    `CREATE INDEX "PlayerPoints_simulationBatchId_idx" ON "PlayerPoints" ("simulationBatchId")`
  );
  await createIndexIfMissing(
    'SimulationTeamBonusAdjustment_simulationBatchId_idx',
    `CREATE INDEX "SimulationTeamBonusAdjustment_simulationBatchId_idx" ON "SimulationTeamBonusAdjustment" ("simulationBatchId")`
  );
  await createIndexIfMissing(
    'SimulationTeamBonusAdjustment_userId_idx',
    `CREATE INDEX "SimulationTeamBonusAdjustment_userId_idx" ON "SimulationTeamBonusAdjustment" ("userId")`
  );

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
