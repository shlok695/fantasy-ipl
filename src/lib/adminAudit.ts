import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

type AuditDb = {
  $executeRawUnsafe: (query: string, ...values: any[]) => PromiseLike<unknown>;
};

export async function ensureAdminAuditTable(db: AuditDb = prisma) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
      "id" TEXT PRIMARY KEY,
      "actor" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

const DEFAULT_AUDIT_DETAILS_MAX = 180;
const EXTENDED_AUDIT_DETAILS_MAX = 900;

export async function recordAdminAuditWithDb(
  db: AuditDb,
  actor: string,
  action: string,
  details: string,
  options?: { maxDetailsLength?: number }
) {
  await ensureAdminAuditTable(db);
  const maxLen = options?.maxDetailsLength ?? DEFAULT_AUDIT_DETAILS_MAX;
  const trimmedDetails = details.trim().slice(0, maxLen);

  await db.$executeRawUnsafe(
    `INSERT INTO "AdminAuditLog" ("id", "actor", "action", "details") VALUES (?, ?, ?, ?)`,
    randomUUID(),
    actor,
    action.trim().slice(0, 60),
    trimmedDetails
  );
}

export async function recordAdminAudit(
  actor: string,
  action: string,
  details: string,
  options?: { maxDetailsLength?: number }
) {
  await recordAdminAuditWithDb(prisma, actor, action, details, options);
}

export async function recordAdminAuditExtended(actor: string, action: string, details: string) {
  return recordAdminAudit(actor, action, details, { maxDetailsLength: EXTENDED_AUDIT_DETAILS_MAX });
}

export async function listAdminAudit(limit = 80) {
  await ensureAdminAuditTable();

  return prisma.$queryRawUnsafe<Array<{
    id: string;
    actor: string;
    action: string;
    details: string;
    createdAt: string;
  }>>(
    `SELECT "id", "actor", "action", "details", "createdAt"
     FROM "AdminAuditLog"
     ORDER BY datetime("createdAt") DESC
     LIMIT ?`,
    limit
  );
}

export async function hasAdminAuditAction(action: string) {
  await ensureAdminAuditTable();

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id"
     FROM "AdminAuditLog"
     WHERE "action" = ?
     LIMIT 1`,
    action
  );

  return rows.length > 0;
}

export async function hasAdminAuditEntry(action: string, detailsFragment: string) {
  await ensureAdminAuditTable();

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id"
     FROM "AdminAuditLog"
     WHERE "action" = ?
       AND instr(lower("details"), lower(?)) > 0
     LIMIT 1`,
    action,
    detailsFragment
  );

  return rows.length > 0;
}
