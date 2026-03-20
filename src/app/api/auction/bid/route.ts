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

    const currentState = await prisma.auctionState.findUnique({
      where: { id: "global" },
      include: { player: true }
    });

    if (!currentState?.player) {
      return NextResponse.json({ error: "No player on the stage." }, { status: 400 });
    }

    // 1. Squad Size Validation (Max 14)
    const squadCount = await prisma.player.count({
      where: { userId: teamId, NOT: { role: "IPL TEAM" } } as any
    });
    
    if (squadCount >= 14) {
      return NextResponse.json({ error: "Your squad is full (14 players max)!" }, { status: 400 });
    }

    // 3. Max Bid Constraint (Ensure they can reach 11 players)
    const MIN_BASE_PRICE = 1.0;
    const MIN_SQUAD_SIZE = 11;
    const isIpLTeamAuction = currentState.player.role === "IPL TEAM";
    
    const spotsNeededAfterThis = Math.max(0, MIN_SQUAD_SIZE - (isIpLTeamAuction ? squadCount : squadCount + 1));
    const reservedBudget = spotsNeededAfterThis * MIN_BASE_PRICE;
    const maxAllowedBid = team.budget - reservedBudget;

    if (parsedAmount > maxAllowedBid) {
      return NextResponse.json({ 
        error: `Insufficient budget for a 11-player squad! Maximum allowed bid: ₹${maxAllowedBid.toFixed(2)} Cr (Reserving ₹${MIN_BASE_PRICE.toFixed(1)} Cr for each of your ${spotsNeededAfterThis} remaining spots)`
      }, { status: 400 });
    }

    // 2. IPL Team Limit Validation (Max 3 from one team)
    const currentPlayerIplTeam = (currentState.player as any).iplTeam;
    if (currentPlayerIplTeam) {
       const sameTeamCount = await prisma.player.count({
         where: { userId: teamId, iplTeam: currentPlayerIplTeam } as any
       });
       if (sameTeamCount >= 3) {
         return NextResponse.json({ error: `You already have 3 players from ${currentPlayerIplTeam}!` }, { status: 400 });
       }
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
