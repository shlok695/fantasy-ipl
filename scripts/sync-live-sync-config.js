const path = require("node:path");
const sqlite3 = require("sqlite3");
const { randomUUID } = require("node:crypto");

function openDatabase(filePath, mode) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, mode, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(db);
    });
  });
}

function all(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows || []);
    });
  });
}

function run(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function splitConfiguredValues(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function ensureTargetTables(db) {
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS "LiveSyncConfig" (
      "configKey" TEXT PRIMARY KEY,
      "matchId" TEXT,
      "matchStartAt" TEXT,
      "afterOverMinutes" INTEGER,
      "intervalMs" INTEGER,
      "enabled" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS "MatchSyncState" (
      "syncKey" TEXT PRIMARY KEY,
      "matchId" TEXT,
      "lastAttemptAt" DATETIME,
      "lastSuccessAt" DATETIME,
      "lastError" TEXT,
      "lastCheckpoint" INTEGER NOT NULL DEFAULT 0
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
      "id" TEXT PRIMARY KEY,
      "actor" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

async function main() {
  const sourceArg = process.argv[2];
  const targetArg = process.argv[3] || path.resolve(process.cwd(), "prisma/dev.db");

  if (!sourceArg) {
    throw new Error("Usage: node scripts/sync-live-sync-config.js <source-db> [target-db]");
  }

  const sourcePath = path.resolve(process.cwd(), sourceArg);
  const targetPath = path.resolve(process.cwd(), targetArg);

  const sourceDb = await openDatabase(sourcePath, sqlite3.OPEN_READONLY);
  const targetDb = await openDatabase(targetPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

  try {
    const configRows = await all(
      sourceDb,
      `SELECT "configKey", "matchId", "matchStartAt", "afterOverMinutes", "intervalMs", "enabled", "updatedAt"
       FROM "LiveSyncConfig"
       WHERE "configKey" = ?
       LIMIT 1`,
      ["primary"]
    );
    const config = configRows[0];

    if (!config) {
      throw new Error(`No LiveSyncConfig row found in ${sourcePath}`);
    }

    const matchIds = splitConfiguredValues(config.matchId || "");
    const syncRows = await all(
      sourceDb,
      `SELECT "syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError", "lastCheckpoint"
       FROM "MatchSyncState"
       WHERE "syncKey" = 'auto-live-match'
          OR "syncKey" LIKE 'auto-live-match:%'
          OR "syncKey" LIKE 'auto-scheduled-match:%'`
    );
    const relevantSyncRows = syncRows.filter((row) => {
      if (row.syncKey === "auto-live-match") {
        return true;
      }

      const matchId = String(row.matchId || "").trim();
      return matchId ? matchIds.includes(matchId) : false;
    });

    await ensureTargetTables(targetDb);
    await run(targetDb, "BEGIN TRANSACTION");

    try {
      await run(
        targetDb,
        `INSERT INTO "LiveSyncConfig" (
          "configKey", "matchId", "matchStartAt", "afterOverMinutes", "intervalMs", "enabled", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT("configKey") DO UPDATE SET
          "matchId" = excluded."matchId",
          "matchStartAt" = excluded."matchStartAt",
          "afterOverMinutes" = excluded."afterOverMinutes",
          "intervalMs" = excluded."intervalMs",
          "enabled" = excluded."enabled",
          "updatedAt" = CURRENT_TIMESTAMP`,
        [
          "primary",
          config.matchId || "",
          config.matchStartAt || "",
          typeof config.afterOverMinutes === "number" ? config.afterOverMinutes : 60,
          typeof config.intervalMs === "number" ? config.intervalMs : 1800000,
          config.enabled ? 1 : 0,
        ]
      );

      for (const row of relevantSyncRows) {
        await run(
          targetDb,
          `INSERT INTO "MatchSyncState" (
            "syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError", "lastCheckpoint"
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT("syncKey") DO UPDATE SET
            "matchId" = excluded."matchId",
            "lastAttemptAt" = excluded."lastAttemptAt",
            "lastSuccessAt" = excluded."lastSuccessAt",
            "lastError" = excluded."lastError",
            "lastCheckpoint" = excluded."lastCheckpoint"`,
          [
            row.syncKey,
            row.matchId || null,
            row.lastAttemptAt || null,
            row.lastSuccessAt || null,
            row.lastError || null,
            typeof row.lastCheckpoint === "number" ? row.lastCheckpoint : 0,
          ]
        );
      }

      await run(
        targetDb,
        `INSERT INTO "AdminAuditLog" ("id", "actor", "action", "details")
         VALUES (?, ?, ?, ?)`,
        [
          randomUUID(),
          "system",
          "LIVE_SYNC_CONFIG_IMPORTED",
          `source:${sourcePath} matches:${matchIds.length}`,
        ]
      );

      await run(targetDb, "COMMIT");
    } catch (error) {
      await run(targetDb, "ROLLBACK");
      throw error;
    }

    console.log(
      JSON.stringify(
        {
          sourcePath,
          targetPath,
          importedMatchIds: matchIds,
          importedSyncRows: relevantSyncRows.length,
          enabled: Boolean(config.enabled),
        },
        null,
        2
      )
    );
  } finally {
    await Promise.all([close(sourceDb), close(targetDb)]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
