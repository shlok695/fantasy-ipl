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
    const { teamId, bonusPoints } = await request.json();

    if (!teamId || typeof bonusPoints !== 'number') {
      return NextResponse.json({ error: "Team and bonus points are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: teamId },
        data: { bonusPoints }
      });

      const totalPoints = await recalculateTeamTotalPoints(teamId, tx);

      const team = await tx.user.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          bonusPoints: true,
          totalPoints: true
        }
      });

      return {
        ...team,
        totalPoints
      };
    });

    await recordAdminAudit(
      session.user!.name || 'admin',
      'TEAM_BONUS_EDIT',
      `${result.name} bonus:${result.bonusPoints} total:${result.totalPoints}`
    );

    return NextResponse.json({ success: true, team: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
