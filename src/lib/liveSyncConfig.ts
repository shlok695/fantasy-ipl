import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { recordAdminAudit } from "@/lib/adminAudit";
import { prisma } from "@/lib/prisma";

export type LiveSyncConfig = {
  matchId: string;
  matchStartAt: string;
  afterOverMinutes: number;
  intervalMs: number;
  enabled: boolean;
};

export type LiveSyncMatchEntry = {
  matchId: string;
  matchStartAt: string;
};

type LiveSyncConfigRow = {
  configKey: string;
  matchId: string | null;
  matchStartAt: string | null;
  afterOverMinutes: number | null;
  intervalMs: number | null;
  enabled: number | null;
  updatedAt: string | null;
};

type MatchSyncStateRow = {
  syncKey: string;
  matchId: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastCheckpoint: number | null;
};

const DEFAULT_CONFIG: LiveSyncConfig = {
  matchId: "",
  matchStartAt: "",
  afterOverMinutes: 60,
  intervalMs: 30 * 60_000,
  enabled: false,
};

let legacyConfigSyncPromise: Promise<void> | null = null;

function resolveActiveSqlitePath() {
  const cwd = /*turbopackIgnore: true*/ process.cwd();
  const databaseUrl = String(process.env.DATABASE_URL || "");
  if (!databaseUrl.startsWith("file:")) {
    return null;
  }

  const filePath = databaseUrl.slice("file:".length);
  if (!filePath) {
    return null;
  }

  if (path.isAbsolute(filePath)) {
    return path.normalize(filePath);
  }

  return path.resolve(cwd, "prisma", filePath);
}

function getLegacySqliteCandidates() {
  const cwd = /*turbopackIgnore: true*/ process.cwd();
  const activePath = resolveActiveSqlitePath();
  const envCandidates = String(process.env.LEGACY_SYNC_DB_PATHS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidates = [
    ...envCandidates.map((entry) => path.resolve(cwd, entry)),
    path.resolve(cwd, "dev.db"),
    path.resolve(cwd, "..", "dev.db"),
  ];

  return [...new Set(candidates.map((entry) => path.normalize(entry)))]
    .filter((entry) => entry !== activePath)
    .filter((entry) => fs.existsSync(entry));
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function openSqliteDatabase(filePath: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(db);
    });
  });
}

function allSqliteRows<T>(db: sqlite3.Database, query: string, params: Array<string> = []) {
  return new Promise<T[]>((resolve, reject) => {
    db.all(query, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve((rows as T[]) || []);
    });
  });
}

function closeSqliteDatabase(db: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function readLegacyLiveSyncSnapshot(filePath: string) {
  const db = await openSqliteDatabase(filePath);

  try {
    const configRows = await allSqliteRows<LiveSyncConfigRow>(
      db,
      `SELECT "configKey", "matchId", "matchStartAt", "afterOverMinutes", "intervalMs", "enabled", "updatedAt"
       FROM "LiveSyncConfig"
       WHERE "configKey" = ?
       LIMIT 1`,
      ["primary"]
    );

    const configRow = configRows[0] || null;
    if (!configRow) {
      return null;
    }

    const matchIds = splitConfiguredValues(configRow.matchId || "");
    const syncRows = await allSqliteRows<MatchSyncStateRow>(
      db,
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

      const rowMatchId = String(row.matchId || "").trim();
      return rowMatchId ? matchIds.includes(rowMatchId) : false;
    });

    return {
      filePath,
      configRow,
      syncRows: relevantSyncRows,
    };
  } finally {
    await closeSqliteDatabase(db);
  }
}

function splitConfiguredValues(value: string) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseConfiguredLiveSyncEntries(input: {
  matchId?: string | null;
  matchStartAt?: string | null;
}) {
  const matchIds = splitConfiguredValues(String(input.matchId || ""));
  const matchStarts = splitConfiguredValues(String(input.matchStartAt || ""));

  if (matchIds.length === 0) {
    return {
      entries: [] as LiveSyncMatchEntry[],
      error: null as string | null,
    };
  }

  if (matchStarts.length !== matchIds.length) {
    return {
      entries: [] as LiveSyncMatchEntry[],
      error:
        "Configured live match IDs and start times must have the same count. Use one entry per line in the same order.",
    };
  }

  const entries: LiveSyncMatchEntry[] = [];
  for (let index = 0; index < matchIds.length; index += 1) {
    const matchId = matchIds[index];
    const matchStartAt = matchStarts[index];

    if (!matchId || !matchStartAt) {
      return {
        entries: [] as LiveSyncMatchEntry[],
        error:
          "Each configured live match must include both a match ID and a start time.",
      };
    }

    if (Number.isNaN(new Date(matchStartAt).getTime())) {
      return {
        entries: [] as LiveSyncMatchEntry[],
        error: `Invalid live match start time: ${matchStartAt}`,
      };
    }

    entries.push({ matchId, matchStartAt });
  }

  return {
    entries,
    error: null as string | null,
  };
}

export async function ensureLiveSyncConfigTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LiveSyncConfig" (
      "configKey" TEXT PRIMARY KEY,
      "matchId" TEXT,
      "matchStartAt" TEXT,
      "afterOverMinutes" INTEGER,
      "intervalMs" INTEGER,
      "enabled" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function normalizeConfig(row?: LiveSyncConfigRow | null): LiveSyncConfig {
  return {
    matchId: row?.matchId || "",
    matchStartAt: row?.matchStartAt || "",
    afterOverMinutes:
      typeof row?.afterOverMinutes === "number" && row.afterOverMinutes >= 0
        ? row.afterOverMinutes
        : DEFAULT_CONFIG.afterOverMinutes,
    intervalMs:
      typeof row?.intervalMs === "number" && row.intervalMs > 0
        ? row.intervalMs
        : DEFAULT_CONFIG.intervalMs,
    enabled: Boolean(row?.enabled),
  };
}

async function ensureMatchSyncStateTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MatchSyncState" (
      "syncKey" TEXT PRIMARY KEY,
      "matchId" TEXT,
      "lastAttemptAt" DATETIME,
      "lastSuccessAt" DATETIME,
      "lastError" TEXT,
      "lastCheckpoint" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function getCurrentLiveSyncConfigRow() {
  await ensureLiveSyncConfigTable();

  const rows = await prisma.$queryRawUnsafe<LiveSyncConfigRow[]>(
    `SELECT "configKey", "matchId", "matchStartAt", "afterOverMinutes", "intervalMs", "enabled", "updatedAt"
     FROM "LiveSyncConfig"
     WHERE "configKey" = ?
     LIMIT 1`,
    "primary"
  );

  return rows[0] || null;
}

async function upsertMatchSyncStateRows(rows: MatchSyncStateRow[]) {
  if (rows.length === 0) {
    return;
  }

  await ensureMatchSyncStateTable();

  for (const row of rows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MatchSyncState" ("syncKey", "matchId", "lastAttemptAt", "lastSuccessAt", "lastError", "lastCheckpoint")
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT("syncKey") DO UPDATE SET
         "matchId" = excluded."matchId",
         "lastAttemptAt" = excluded."lastAttemptAt",
         "lastSuccessAt" = excluded."lastSuccessAt",
         "lastError" = excluded."lastError",
         "lastCheckpoint" = excluded."lastCheckpoint"`,
      row.syncKey,
      row.matchId,
      row.lastAttemptAt,
      row.lastSuccessAt,
      row.lastError,
      row.lastCheckpoint ?? 0
    );
  }
}

async function maybeSyncLegacyLiveSyncConfig() {
  if (legacyConfigSyncPromise) {
    return legacyConfigSyncPromise;
  }

  legacyConfigSyncPromise = (async () => {
    const currentRow = await getCurrentLiveSyncConfigRow();
    const currentTimestamp = toTimestamp(currentRow?.updatedAt);
    const legacyCandidates = getLegacySqliteCandidates();

    let newestSnapshot: Awaited<ReturnType<typeof readLegacyLiveSyncSnapshot>> = null;
    let newestTimestamp = currentTimestamp;

    for (const candidate of legacyCandidates) {
      try {
        const snapshot = await readLegacyLiveSyncSnapshot(candidate);
        if (!snapshot) {
          continue;
        }

        const snapshotTimestamp = toTimestamp(snapshot.configRow.updatedAt);
        if (snapshotTimestamp > newestTimestamp) {
          newestSnapshot = snapshot;
          newestTimestamp = snapshotTimestamp;
        }
      } catch {
        // Ignore unreadable legacy candidates and keep the active database authoritative.
      }
    }

    if (!newestSnapshot) {
      return;
    }

    await persistLiveSyncConfig({
      matchId: newestSnapshot.configRow.matchId || "",
      matchStartAt: newestSnapshot.configRow.matchStartAt || "",
      afterOverMinutes:
        typeof newestSnapshot.configRow.afterOverMinutes === "number"
          ? newestSnapshot.configRow.afterOverMinutes
          : DEFAULT_CONFIG.afterOverMinutes,
      intervalMs:
        typeof newestSnapshot.configRow.intervalMs === "number"
          ? newestSnapshot.configRow.intervalMs
          : DEFAULT_CONFIG.intervalMs,
      enabled: Boolean(newestSnapshot.configRow.enabled),
    });

    await upsertMatchSyncStateRows(newestSnapshot.syncRows);
    await recordAdminAudit(
      "system",
      "LIVE_SYNC_CONFIG_MIGRATED",
      `source:${path.basename(newestSnapshot.filePath)} matches:${splitConfiguredValues(newestSnapshot.configRow.matchId || "").length} updated:${newestSnapshot.configRow.updatedAt || "unknown"}`
    );
  })().finally(() => {
    legacyConfigSyncPromise = null;
  });

  return legacyConfigSyncPromise;
}

export async function getLiveSyncConfig(): Promise<LiveSyncConfig> {
  await maybeSyncLegacyLiveSyncConfig();
  return normalizeConfig(await getCurrentLiveSyncConfigRow());
}

async function persistLiveSyncConfig(
  input: Partial<LiveSyncConfig>
): Promise<LiveSyncConfig> {
  const current = normalizeConfig(await getCurrentLiveSyncConfigRow());
  const next: LiveSyncConfig = {
    matchId: (input.matchId ?? current.matchId).trim(),
    matchStartAt: (input.matchStartAt ?? current.matchStartAt).trim(),
    afterOverMinutes:
      typeof input.afterOverMinutes === "number"
        ? input.afterOverMinutes
        : current.afterOverMinutes,
    intervalMs:
      typeof input.intervalMs === "number"
        ? input.intervalMs
        : current.intervalMs,
    enabled:
      typeof input.enabled === "boolean" ? input.enabled : current.enabled,
  };

  await ensureLiveSyncConfigTable();
  await prisma.$executeRawUnsafe(
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
    "primary",
    next.matchId,
    next.matchStartAt,
    next.afterOverMinutes,
    next.intervalMs,
    next.enabled ? 1 : 0
  );

  return next;
}

export async function saveLiveSyncConfig(
  input: Partial<LiveSyncConfig>
): Promise<LiveSyncConfig> {
  await maybeSyncLegacyLiveSyncConfig();
  return persistLiveSyncConfig(input);
}
