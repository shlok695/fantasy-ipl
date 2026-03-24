import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAdminAudit } from '@/lib/adminAudit';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.name !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    // Run in transaction to safely reset players and delete the team
    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.user.findUnique({
        where: { id: teamId }
      });

      if (!team) throw new Error("Team not found");
      if (team.name === 'admin') throw new Error("Cannot delete the admin account");

      // Unassign all players that belonged to this team so they go back into the default pool
      await tx.player.updateMany({
        where: { userId: teamId },
        data: {
          userId: null,
          auctionPrice: null,
          acquisition: 'Unsold'
        }
      });

      // Finally, delete the franchise
      const deletedTeam = await tx.user.delete({
        where: { id: teamId }
      });

      return deletedTeam;
    });

    await recordAdminAudit(session.user!.name || 'admin', 'TEAM_DELETE', result.name);
    return NextResponse.json({ success: true, team: result });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
