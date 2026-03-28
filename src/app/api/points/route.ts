import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateTeamTotalPoints } from '@/utils/teamScore';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAdminAudit } from '@/lib/adminAudit';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playerId, points, matchNumber, mode } = await request.json();

    if (!playerId || typeof points !== 'number') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let pointsRecord;

      if (mode === 'set') {
        if (!matchNumber) {
          throw new Error("Match number is required when editing an existing player score");
        }

        const existingRecord = await tx.playerPoints.findFirst({
          where: {
            playerId,
            matchId: String(matchNumber)
          }
        });

        pointsRecord = existingRecord
          ? await tx.playerPoints.update({
              where: { id: existingRecord.id },
              data: { points }
            })
          : await tx.playerPoints.create({
              data: {
                playerId,
                points,
                matchId: String(matchNumber)
              }
            });
      } else {
        pointsRecord = await tx.playerPoints.create({
          data: {
            playerId,
            points,
            matchId: matchNumber ? String(matchNumber) : null
          }
        });
      }

      const player = await tx.player.findUnique({
        where: { id: playerId },
      });

      if (player?.userId) {
        await recalculateTeamTotalPoints(player.userId, tx);
      }

      return pointsRecord;
    });

    await recordAdminAudit(
      session.user!.name || 'admin',
      mode === 'set' ? 'PLAYER_POINTS_EDIT' : 'PLAYER_POINTS_ADD',
      `${playerId} m:${matchNumber ?? '-'} pts:${points}`
    );

    return NextResponse.json({ success: true, record: result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
