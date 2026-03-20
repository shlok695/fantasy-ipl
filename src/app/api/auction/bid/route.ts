import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = (session.user as any).id;
    const team = await prisma.user.findUnique({ where: { id: teamId } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const { amount } = await request.json();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
    }

    if (parsedAmount > team.budget) {
      return NextResponse.json({ error: "Not enough budget!" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.auctionState.findUnique({ where: { id: "global" } });
      if (!state || !state.currentPlayerId) throw new Error("No active auction is currently running.");

      const updated = await tx.auctionState.update({
        where: { id: "global" },
        data: {
          highestBid: parsedAmount,
          highestBidderId: teamId
        },
        include: {
          player: true,
          highestBidder: true
        }
      });
      return updated;
    });

    return NextResponse.json({ success: true, state: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
