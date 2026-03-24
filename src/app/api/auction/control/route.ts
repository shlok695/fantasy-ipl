import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAdminAudit } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, playerId, basePrice, category } = body;
    console.log(`[Auction Control] Action: ${action}`, body);

     // Initialize state if needed
     const stateExists = await prisma.auctionState.findUnique({ where: { id: "global" }});
     if (!stateExists) {
        await prisma.auctionState.create({ data: { id: "global", highestBid: 0 }});
     }

     if (action === "START") {
        const state = await prisma.auctionState.update({
           where: { id: "global" },
           data: {
              currentPlayerId: String(playerId),
              highestBid: Number(basePrice) || 0,
              highestBidderId: null,
              status: "BIDDING",
              readyTeams: ""
           }
        });
        await recordAdminAudit(session.user!.name || 'admin', 'AUCTION_START', `${playerId} base:${Number(basePrice) || 0}`);
        return NextResponse.json({ success: true, state });
     } 
     
     else if (action === "SELL") {
        const state = await prisma.auctionState.findUnique({ where: { id: "global" }});
        if (!state?.currentPlayerId) throw new Error("No player being auctioned");
        if (!state.highestBidderId) throw new Error("No one bid yet!");
        
        const bidAmount = state.highestBid;
        const result = await prisma.$transaction(async (tx) => {
           const player = await tx.player.findUnique({ where: { id: state.currentPlayerId! }});
           if (!player) throw new Error("Player not found");

           const team = await tx.user.findUnique({ where: { id: state.highestBidderId! }});
           if (!team || team.budget < bidAmount) throw new Error("Not enough budget");
           
           const isTeamAuction = player.role === "IPL TEAM";
           
           // Update User
           await tx.user.update({
              where: { id: team.id },
              data: { 
                budget: team.budget - bidAmount,
                ...(isTeamAuction ? { iplTeam: player.name } : {})
              }
           });
           
           // Update Player
           await tx.player.update({
              where: { id: state.currentPlayerId! },
              data: {
                 userId: isTeamAuction ? null : team.id,
                 auctionPrice: bidAmount,
                 acquisition: "Sold",
              }
           });
           
           // Transition
           await tx.auctionState.update({
              where: { id: "global" },
              data: { status: "SUMMARY", readyTeams: "", updatedAt: new Date() }
           });

           return { playerName: player.name, teamName: team.name, bidAmount };
        });
        await recordAdminAudit(session.user!.name || 'admin', 'AUCTION_SELL', `${result.playerName} ${result.teamName} ${result.bidAmount}`);
        return NextResponse.json({ success: true });
     } 
     
     else if (action === "UNSOLD") {
        const state = await prisma.auctionState.findUnique({ where: { id: "global" }});
        if (state?.currentPlayerId) {
           await prisma.player.update({
              where: { id: state.currentPlayerId },
              data: { acquisition: "Unsold" }
           });
        }
        await prisma.auctionState.update({
           where: { id: "global" },
           data: { status: "SUMMARY", readyTeams: "" }
        });
        await recordAdminAudit(session.user!.name || 'admin', 'AUCTION_UNSOLD', `${state?.currentPlayerId || 'none'}`);
        return NextResponse.json({ success: true });
     }
     
     else if (action === "START_AUTO_QUEUE") {
        const { pushNextPlayer } = await import('@/lib/auctionEngine');
        console.log(`[Control] START_AUTO_QUEUE with category:`, category);
        const pushed = await pushNextPlayer(category);
        
        if (!pushed) {
          console.log(`[Control] pushNextPlayer returned false`);
          return NextResponse.json({ success: false, message: "No players available to push" });
        }
        
        // Fetch and return the full state with player data for immediate UI update
        const updatedState = await prisma.auctionState.findUnique({
          where: { id: "global" },
          include: { player: true, highestBidder: true }
        });
        
        console.log(`[Control] Successfully pushed player:`, updatedState?.player?.name);
        await recordAdminAudit(session.user!.name || 'admin', 'AUTO_QUEUE_PUSH', updatedState?.player?.name || 'none');
        return NextResponse.json({ success: true, state: updatedState });
     }

     else if (action === "START_TEAM_QUEUE") {
        const nextTeam = await prisma.player.findFirst({
          where: { role: "IPL TEAM", acquisition: null },
          orderBy: { name: 'asc' }
        });
        if (!nextTeam) throw new Error("No more IPL teams!");

        await prisma.auctionState.update({
          where: { id: "global" },
          data: {
            currentPlayerId: nextTeam.id,
            highestBid: parseFloat(nextTeam.basePrice || "2.0"),
            highestBidderId: null,
            status: "BIDDING",
            readyTeams: ""
          }
        });
        await recordAdminAudit(session.user!.name || 'admin', 'TEAM_QUEUE_START', nextTeam.name);
        return NextResponse.json({ success: true });
     }
     
     else if (action === "RESET_BID") {
       const state = await prisma.auctionState.findUnique({ where: { id: "global" }, include: { player: true } });
       if (state?.currentPlayerId) {
         const base = state.player?.basePrice ? parseFloat(state.player.basePrice.replace(/[^0-9.]/g, '')) : 2.0;
         await prisma.auctionState.update({
            where: { id: "global" },
            data: { highestBid: base, highestBidderId: null }
         });
       }
       await recordAdminAudit(session.user!.name || 'admin', 'BID_RESET', state?.player?.name || state?.currentPlayerId || 'none');
       return NextResponse.json({ success: true });
     }
     
     return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch(e: any) {
     return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
