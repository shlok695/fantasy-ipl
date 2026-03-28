import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { hasAdminAuditAction, recordAdminAudit } from '@/lib/adminAudit';
import { formatSeasonAwardAuditDetails, getSeasonAwardBonusByTeam, getSeasonAwardWinners } from '@/lib/seasonAwards';
import { recalculateLeagueTotalPoints } from '@/utils/teamScore';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (await hasAdminAuditAction('SEASON_AWARDS_APPLIED')) {
      return NextResponse.json({ error: "Season awards bonus has already been applied" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const players = await tx.player.findMany({
        where: { userId: { not: null }, role: { not: 'IPL TEAM' } },
        select: {
          id: true,
          name: true,
          userId: true,
          user: { select: { name: true } },
          points: {
            select: {
              points: true,
              runs: true,
              wickets: true,
            }
          }
        }
      });

      const winners = getSeasonAwardWinners(players);
      if (winners.length === 0) {
        throw new Error('No eligible player stats found for season awards');
      }

      const bonusByTeam = getSeasonAwardBonusByTeam(winners);

      for (const [teamId, points] of bonusByTeam.entries()) {
        await tx.user.update({
          where: { id: teamId },
          data: { bonusPoints: { increment: points } }
        });
      }

      await recalculateLeagueTotalPoints(tx);

      return winners;
    });

    await recordAdminAudit(
      session.user!.name || 'admin',
      'SEASON_AWARDS_APPLIED',
      formatSeasonAwardAuditDetails(result)
    );

    return NextResponse.json({ success: true, winners: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
