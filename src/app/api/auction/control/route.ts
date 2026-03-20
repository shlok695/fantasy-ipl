import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
     const { action, playerId, basePrice, category } = await request.json();

     // Initialize the state row if it somehow doesn't exist
     const stateExists = await prisma.auctionState.findUnique({ where: { id: "global" }});
     if (!stateExists) {
        await prisma.auctionState.create({ data: { id: "global", highestBid: 0 }});
     }

     if (action === "START") {
        const timeLimitMs = 60000; // 60 seconds
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
        return NextResponse.json({ success: true, state });
     } 
     
     else if (action === "SELL") {
        const state = await prisma.auctionState.findUnique({ where: { id: "global" }});
        if (!state?.currentPlayerId) throw new Error("No player being auctioned");
        if (!state.highestBidderId) throw new Error("No one bid on this player yet!");
        
        const bidAmount = state.highestBid;
        const res = await prisma.$transaction(async (tx) => {
           // 1. Deduct budget
           const team = await tx.user.findUnique({ where: { id: state.highestBidderId! }});
           if (!team || team.budget < bidAmount) throw new Error("Not enough budget");
           await tx.user.update({
              where: { id: team.id },
              data: { budget: team.budget - bidAmount }
           });
           
           // 2. Assign player
           await tx.player.update({
              where: { id: state.currentPlayerId! },
              data: {
                 userId: team.id,
                 auctionPrice: bidAmount,
                 acquisition: "Sold",
              }
           });
           
           // 3. Transition to SUMMARY phase for the Ready-Check
           await tx.auctionState.update({
              where: { id: "global" },
              data: {
                 status: "SUMMARY",
                 readyTeams: ""
              }
           });
           return true;
        });
        return NextResponse.json({ success: true });
     } 
     
     else if (action === "UNSOLD") {
       // Mark player as unsold in database
       const state = await prisma.auctionState.findUnique({ where: { id: "global" }});
       if (state?.currentPlayerId) {
          await prisma.player.update({
             where: { id: state.currentPlayerId },
             data: { acquisition: "Unsold" }
          });
       }

       // Transition to SUMMARY phase for the Ready-Check
       await prisma.auctionState.update({
          where: { id: "global" },
          data: { status: "SUMMARY", readyTeams: "" }
       });
       return NextResponse.json({ success: true });
     }
     
     else if (action === "START_AUTO_QUEUE") {
       const { pushNextPlayer } = await import('@/lib/auctionEngine');
       const pushed = await pushNextPlayer(category);
       return NextResponse.json({ success: pushed });
     }
     
     else if (action === "RESET_BID") {
       const state = await prisma.auctionState.findUnique({ where: { id: "global" }, include: { player: true } });
       if (state?.currentPlayerId) {
         let base = 2.0;
         if (state.player?.basePrice) {
            base = parseFloat(state.player.basePrice.replace(/[^0-9.]/g, '')) || 2.0;
         }
         await prisma.auctionState.update({
            where: { id: "global" },
            data: {
               highestBid: base,
               highestBidderId: null
            }
         });
       }
       return NextResponse.json({ success: true });
     }
     
     return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch(e: any) {
     return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
