const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function getColumns(prisma, tableName) {
  return prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
}

async function addColumnIfMissing(prisma, tableName, columnName, definition) {
  const columns = await getColumns(prisma, tableName);
  if (columns.some((column) => column.name === columnName)) {
    return false;
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`
  );
  return true;
}

async function indexExists(prisma, indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type = 'index' AND name = ? LIMIT 1`,
    indexName
  );

  return rows.length > 0;
}

async function main() {
  loadEnv();
  const prisma = new PrismaClient();

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Match" (
        "id" TEXT PRIMARY KEY,
        "displayId" TEXT,
        "shortTitle" TEXT,
        "title" TEXT,
        "season" TEXT,
        "status" TEXT,
        "team1Code" TEXT,
        "team2Code" TEXT,
        "team1Name" TEXT,
        "team2Name" TEXT,
        "source" TEXT,
        "startedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (!(await indexExists(prisma, 'Match_displayId_idx'))) {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX "Match_displayId_idx" ON "Match" ("displayId")`
      );
    }

    await addColumnIfMissing(prisma, 'PlayerPoints', 'breakdownJson', 'TEXT');
    await addColumnIfMissing(prisma, 'PlayerPoints', 'statsJson', 'TEXT');
    await addColumnIfMissing(prisma, 'PlayerPoints', 'scoreVersion', 'TEXT');
    await addColumnIfMissing(prisma, 'PlayerPoints', 'calculationHash', 'TEXT');
    await addColumnIfMissing(prisma, 'PlayerPoints', 'source', 'TEXT');
    await addColumnIfMissing(prisma, 'PlayerPoints', 'updatedAt', 'DATETIME');

    await prisma.$executeRawUnsafe(`
      UPDATE "PlayerPoints"
      SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
      WHERE "updatedAt" IS NULL
    `);

    if (!(await indexExists(prisma, 'PlayerPoints_matchId_idx'))) {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX "PlayerPoints_matchId_idx" ON "PlayerPoints" ("matchId")`
      );
    }

    if (!(await indexExists(prisma, 'PlayerPoints_playerId_matchId_key'))) {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX "PlayerPoints_playerId_matchId_key"
         ON "PlayerPoints" ("playerId", "matchId")
         WHERE "matchId" IS NOT NULL`
      );
    }

    console.log(JSON.stringify({ success: true }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
