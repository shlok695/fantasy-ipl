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
    const body = await request.json();
    const playerId = body.playerId;
    const rawPoints = body.points;
    const mode = body.mode ?? 'add';
    let matchId = body.matchNumber ?? body.matchId ?? null;

    if (typeof matchId === 'number') {
      matchId = String(matchId);
    }

    if (typeof matchId === 'string' && matchId.trim() === '') {
      matchId = null;
    }

    const points = Number(rawPoints);

    if (!playerId || !Number.isFinite(points)) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    if (mode !== 'add' && mode !== 'set') {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const adminActor = session.user!.name || 'admin';
    const sourceSet = `admin:manual-set:${adminActor}`;
    const sourceAdd = `admin:manual-adjustment:${adminActor}`;

    const result = await prisma.$transaction(async (tx) => {
      let pointsRecord;

      if (mode === 'set') {
        if (!matchId) {
          throw new Error("Match number is required when editing an existing player score");
        }

        const existingRecord = await tx.playerPoints.findFirst({
          where: {
            playerId,
            matchId: String(matchId)
          }
        });

        const previousPoints = existingRecord?.points;
        const previousSource = existingRecord?.source;

        pointsRecord = existingRecord
          ? await tx.playerPoints.update({
              where: { id: existingRecord.id },
              data: {
                points,
                breakdownJson: null,
                statsJson: null,
                scoreVersion: 'manual-override',
                calculationHash: null,
                source: sourceSet,
              }
            })
          : await tx.playerPoints.create({
              data: {
                playerId,
                points,
                matchId: String(matchId),
                scoreVersion: 'manual-override',
                source: sourceSet,
              }
            });

        console.info(
          `[points/manual-override] actor=${adminActor} playerId=${playerId} matchId=${matchId} ` +
            `previousPts=${previousPoints ?? 'n/a'} newPts=${points} previousSource=${previousSource ?? 'n/a'}`
        );
      } else {
        if (matchId) {
          throw new Error("Add mode is only for manual adjustments without a match number. Use edit mode for match points.");
        }

        pointsRecord = await tx.playerPoints.create({
          data: {
            playerId,
            points,
            matchId: null,
            scoreVersion: 'manual-adjustment',
            source: sourceAdd,
          }
        });

        console.info(
          `[points/manual-adjustment] actor=${adminActor} playerId=${playerId} pts=${points}`
        );
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
      adminActor,
      mode === 'set' ? 'PLAYER_POINTS_EDIT' : 'PLAYER_POINTS_ADD',
      `${playerId} m:${matchId ?? '-'} pts:${points} by:${adminActor}`
    );

    return NextResponse.json({ success: true, record: result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
