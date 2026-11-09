import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errorMessage";

function isFinalMatchStatus(statusText?: string | null) {
  const status = String(statusText || "").toLowerCase();
  if (!status.trim()) {
    return false;
  }

  return /\b(won|won by|lost|no result|abandon(?:ed)?|washout|match over|finished|complete(?:d)?|super over)\b/.test(status);
}

function isUnfinishedMatchStatus(statusText?: string | null) {
  const status = String(statusText || "").toLowerCase();
  if (!status.trim() || isFinalMatchStatus(status)) {
    return false;
  }

  return (
    /\b(need|needs|required|requires|live|in progress|innings|innings break|rain|delay|drinks|strategic|stumps|trail|lead by)\b/.test(status) ||
    /\d+\/\d+/.test(status) ||
    /\bovers?\b/.test(status)
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.name !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        syncKey: string;
        matchId: string | null;
        lastAttemptAt: string | null;
        lastSuccessAt: string | null;
        lastError: string | null;
        lastCheckpoint: number | null;
        displayId: string | null;
        shortTitle: string | null;
        status: string | null;
        startedAt: string | null;
      }>
    >(`
      SELECT
        s."syncKey",
        s."matchId",
        s."lastAttemptAt",
        s."lastSuccessAt",
        s."lastError",
        s."lastCheckpoint",
        m."displayId",
        m."shortTitle",
        m."status",
        m."startedAt"
      FROM "MatchSyncState" s
      JOIN "Match" m ON m."id" = s."matchId"
      WHERE s."syncKey" LIKE 'auto-unfinished-match:%'
        AND COALESCE(s."lastCheckpoint", 0) >= 2
      ORDER BY s."lastAttemptAt" DESC
    `);

    const alerts = rows
      .filter((row) => isUnfinishedMatchStatus(row.status))
      .map((row) => ({
        syncKey: row.syncKey,
        matchId: row.matchId,
        apiId: row.matchId,
        displayId: row.displayId,
        shortTitle: row.shortTitle,
        status: row.status,
        attempts: Number(row.lastCheckpoint || 0),
        lastAttemptAt: row.lastAttemptAt,
        lastSuccessAt: row.lastSuccessAt,
        lastError: row.lastError,
        startedAt: row.startedAt,
      }));

    return NextResponse.json({ alerts });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
