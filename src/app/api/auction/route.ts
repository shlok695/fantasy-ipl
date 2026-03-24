import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAdminAudit } from '@/lib/adminAudit';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  try {
    const { playerId, teamId, amount } = await request.json();

    if (!playerId || !teamId || typeof amount !== 'number') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Run in transaction to ensure budget is checked safely
    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.user.findUnique({ where: { id: teamId } });
      const player = await tx.player.findUnique({ where: { id: playerId } });

      if (!team) throw new Error("Team not found");
      if (!player) throw new Error("Player not found");
      if (player.userId) throw new Error("Player already sold");
      if (team.budget < amount) throw new Error("Insufficient budget");

      // Update team budget
      await tx.user.update({
        where: { id: teamId },
        data: { budget: team.budget - amount }
      });

      // Assign player
      const updatedPlayer = await tx.player.update({
        where: { id: playerId },
        data: {
          userId: teamId,
          auctionPrice: amount
        }
      });

      return { updatedPlayer, teamName: team.name };
    });

    if (session?.user?.name === 'admin') {
      await recordAdminAudit(session.user.name || 'admin', 'MANUAL_SELL', `${result.updatedPlayer.name} -> ${result.teamName} ${amount}`);
    }

    return NextResponse.json({ success: true, player: result.updatedPlayer });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
