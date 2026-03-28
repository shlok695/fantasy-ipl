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
    const { iplTeam } = await request.json();

    if (!iplTeam) {
      return NextResponse.json({ error: "Missing iplTeam" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find all users who picked this team
      const users = await tx.user.findMany({
        where: { iplTeam },
        select: { id: true, name: true }
      });

      for (const user of users) {
        // Add 50 bonus points
        await tx.user.update({
          where: { id: user.id },
          data: { bonusPoints: { increment: 50 } }
        });

        // Recalculate their total
        await recalculateTeamTotalPoints(user.id, tx);
      }

      return { updatedCount: users.length };
    });

    await recordAdminAudit(
      session.user!.name || 'admin',
      'PARTNER_WIN_BONUS',
      `${iplTeam} +50 to ${result.updatedCount} team(s)`
    );

    return NextResponse.json({ success: true, result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
