import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.auctionState.findUnique({ 
        where: { id: "global" },
        include: { player: true, highestBidder: true } 
      });

      if (!state || !state.player || state.status !== "BIDDING") {
        throw new Error("No active bidding to RTM.");
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found.");

      // Use any cast to avoid TS errors until client is fully synced in IDE
      const userAny = user as any;
      const playerAny = state.player as any;

      if (userAny.rtmUsed) {
        throw new Error("You have already used your RTM.");
      }

      if (playerAny.iplTeam !== userAny.iplTeam) {
        throw new Error(`This player is from ${playerAny.iplTeam}, but your partner team is ${userAny.iplTeam}.`);
      }

      if (state.highestBidderId === userId) {
        throw new Error("You are already the highest bidder!");
      }

      if (user.budget < state.highestBid) {
        throw new Error("Not enough budget to match this bid!");
      }

      // Check squad size (exclude IPL Team records)
      const squadCount = await tx.player.count({ 
        where: { userId, NOT: { role: "IPL TEAM" } } 
      });
      if (squadCount >= 14) throw new Error("Squad full!");

      // PERFORM RTM
      const updated = await tx.auctionState.update({
        where: { id: "global" },
        data: {
          highestBidderId: userId
        }
      });

      // Mark RTM as used
      await tx.user.update({
        where: { id: userId },
        data: { rtmUsed: true }
      });

      return updated;
    });

    return NextResponse.json({ success: true, state: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
