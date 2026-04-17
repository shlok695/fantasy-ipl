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

const DEFAULT_CONFIG: LiveSyncConfig = {
  matchId: "",
  matchStartAt: "",
  afterOverMinutes: 60,
  intervalMs: 30 * 60_000,
  enabled: false,
};

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

export async function getLiveSyncConfig(): Promise<LiveSyncConfig> {
  await ensureLiveSyncConfigTable();

  const rows = await prisma.$queryRawUnsafe<LiveSyncConfigRow[]>(
    `SELECT "configKey", "matchId", "matchStartAt", "afterOverMinutes", "intervalMs", "enabled", "updatedAt"
     FROM "LiveSyncConfig"
     WHERE "configKey" = ?
     LIMIT 1`,
    "primary"
  );

  return normalizeConfig(rows[0]);
}

export async function saveLiveSyncConfig(
  input: Partial<LiveSyncConfig>
): Promise<LiveSyncConfig> {
  const current = await getLiveSyncConfig();
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
