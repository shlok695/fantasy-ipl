import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateTeamTotalPoints } from '@/utils/teamScore';

export async function POST(request: Request) {
  try {
    const { playerId, points, matchNumber } = await request.json();

    if (!playerId || typeof points !== 'number') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create points record
      const pointsRecord = await tx.playerPoints.create({
        data: {
          playerId,
          points,
          matchId: matchNumber ? String(matchNumber) : null
        }
      });

      // Get player and their team
      const player = await tx.player.findUnique({
        where: { id: playerId },
      });

      if (player?.userId) {
        // Recalculate the team's total points based on the Top 11 Players rule
        await recalculateTeamTotalPoints(player.userId, tx);
      }

      return pointsRecord;
    });

    return NextResponse.json({ success: true, record: result });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
