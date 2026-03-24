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
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }

    // Run in transaction to safely refund the budget and unassign the player
    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { user: true }
      });

      if (!player) throw new Error("Player not found");
      if (!player.userId) throw new Error("Player is not assigned to any team");

      const refundAmount = player.auctionPrice || 0;
      const teamId = player.userId;

      // Unassign the player and reset their auction price
      const updatedPlayer = await tx.player.update({
        where: { id: playerId },
        data: {
          userId: null,
          auctionPrice: null,
          acquisition: 'Unsold'
        }
      });

      // Refund the budget to the team
      if (player.user) {
        await tx.user.update({
          where: { id: teamId },
          data: { budget: player.user.budget + refundAmount }
        });
      }

      return { updatedPlayer, teamName: player.user?.name || 'Unknown', refundAmount };
    });

    await recordAdminAudit(session.user!.name || 'admin', 'PLAYER_DROP', `${result.updatedPlayer.name} from ${result.teamName} refund:${result.refundAmount}`);
    return NextResponse.json({ success: true, player: result.updatedPlayer });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
