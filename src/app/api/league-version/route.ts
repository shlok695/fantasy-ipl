import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errorMessage";
import { maybeAutoSyncConfiguredMatch } from "@/lib/matchSync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET() {
  try {
    try {
      await maybeAutoSyncConfiguredMatch();
    } catch (syncError) {
      console.error("Auto-sync skipped after failure in /api/league-version", syncError);
    }

    const [pointsSummary, teamSummary, matchSummary] = await Promise.all([
      prisma.playerPoints.aggregate({
        _count: { id: true },
        _max: { updatedAt: true },
      }),
      prisma.user.aggregate({
        where: {
          name: { not: "admin" },
        },
        _count: { id: true },
        _max: { updatedAt: true },
      }),
      prisma.match.aggregate({
        _count: { id: true },
        _max: { updatedAt: true },
      }),
    ]);

    const version = [
      toIso(pointsSummary._max.updatedAt),
      pointsSummary._count.id,
      toIso(teamSummary._max.updatedAt),
      teamSummary._count.id,
      toIso(matchSummary._max.updatedAt),
      matchSummary._count.id,
    ].join(":");

    return NextResponse.json(
      {
        version,
        playerPointsUpdatedAt: toIso(pointsSummary._max.updatedAt),
        playerPointsCount: pointsSummary._count.id,
        teamsUpdatedAt: toIso(teamSummary._max.updatedAt),
        teamCount: teamSummary._count.id,
        matchesUpdatedAt: toIso(matchSummary._max.updatedAt),
        matchCount: matchSummary._count.id,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
