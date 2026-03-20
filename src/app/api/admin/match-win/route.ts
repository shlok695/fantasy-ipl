import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateTeamTotalPoints } from '@/utils/teamScore';

export async function POST(request: Request) {
  try {
    const { iplTeam } = await request.json();

    if (!iplTeam) {
      return NextResponse.json({ error: "Missing iplTeam" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find all users who picked this team
      const users = await tx.user.findMany({
        where: { iplTeam }
      });

      for (const user of users) {
        // Add 50 bonus points
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { bonusPoints: { increment: 50 } }
        });
        
        // Recalculate their total
        await recalculateTeamTotalPoints(user.id, tx);
      }

      return { updatedCount: users.length };
    });

    return NextResponse.json({ success: true, result });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
