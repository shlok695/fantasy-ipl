import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function ensureAdminAuditTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
      "id" TEXT PRIMARY KEY,
      "actor" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function recordAdminAudit(actor: string, action: string, details: string) {
  await ensureAdminAuditTable();
  const trimmedDetails = details.trim().slice(0, 180);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "AdminAuditLog" ("id", "actor", "action", "details") VALUES (?, ?, ?, ?)`,
    randomUUID(),
    actor,
    action.trim().slice(0, 60),
    trimmedDetails
  );
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
