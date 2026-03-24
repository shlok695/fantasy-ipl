import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pushNextPlayer } from "@/lib/auctionEngine";
import { getLiveRoomVisible } from "@/lib/liveRoomVisibility";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Update user activity if logged in - but ONLY every 15s to avoid SQLite deadlock
    if (session?.user && (session.user as any).id) {
      const userId = (session.user as any).id;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastActive: true } });
      const now = new Date();
      if (!user?.lastActive || (now.getTime() - new Date(user.lastActive).getTime() > 15000)) {
        await prisma.user.update({
          where: { id: userId },
          data: { lastActive: now }
        }).catch(err => console.error("lastActive update failed", err));
      }
    }

    let state = await prisma.auctionState.findUnique({
      where: { id: "global" },
      include: {
        player: true,
        highestBidder: true
      }
    });

    if (!state) {
      // Initialize if it doesn't exist
      state = await prisma.auctionState.create({
        data: { id: "global", highestBid: 0 },
        include: {
          player: true,
          highestBidder: true
        }
      });
    }

    const liveRoomVisible = await getLiveRoomVisible();

    if (session?.user?.name !== 'admin' && !liveRoomVisible) {
      return NextResponse.json({ error: "Live room is hidden", hidden: true }, { status: 403 });
    }

    // 2. Auto-Push Logic: If SUMMARY for too long, push!
    // Trigger if > 10 seconds in summary
    if (state.status === "SUMMARY" && state.updatedAt) {
      const elapsed = Date.now() - new Date(state.updatedAt).getTime();
      const delay = 10000; // 10 seconds
      if (elapsed > delay) { 
        console.log(`[Auto-Push] Triggering next player (Elapsed: ${elapsed}ms)...`);
        try {
          const pushed = await pushNextPlayer();
          console.log(`[Auto-Push Result] Success: ${pushed}`);
          if (pushed) {
             const newState = await prisma.auctionState.findUnique({
               where: { id: "global" },
               include: { player: true, highestBidder: true }
             });
             if (newState) state = newState;
          }
        } catch (e: any) {
          console.error("[Auto-Push Error]", e.message);
        }
      } else {
        // Optional: log progress if needed for debugging
        // console.log(`[Auction Status] SUMMARY. Waiting... ${Math.round((delay-elapsed)/1000)}s left.`);
      }
    }
    
    // Server computes the exact remaining milliseconds so all clients are strictly synced
    const serverTime = Date.now();
    
    return NextResponse.json({
      state,
      serverTime,
      visible: liveRoomVisible
    });
  } catch(e: any) {
    console.error("Live API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
