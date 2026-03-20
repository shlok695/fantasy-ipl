import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
    
    // Server computes the exact remaining milliseconds so all clients are strictly synced
    const serverTime = Date.now();
    
    return NextResponse.json({
      state,
      serverTime
    });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
