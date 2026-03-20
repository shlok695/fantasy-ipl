import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pushNextPlayer } from "@/lib/auctionEngine";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await prisma.auctionState.findUnique({ where: { id: "global" } });
    if (!state || state.status !== "SUMMARY") {
      return NextResponse.json({ error: "Not in summary phase" });
    }

    let readyTeams = state.readyTeams ? state.readyTeams.split(',').filter(id => id.trim() !== '') : [];
    
    // Add this user if they haven't readied up
    if (session?.user && !readyTeams.includes((session.user as any).id)) {
      readyTeams.push((session.user as any).id);
    }

    // Count active participating franchises (exclude 'admin')
    const activeTeams = await prisma.user.count({ 
      where: { name: { not: "admin" } } 
    });

    if (readyTeams.length >= activeTeams && activeTeams > 0) {
      // ALL FRANCHISES ARE READY! 
      // Auto-push the next player and start the next round!
      await pushNextPlayer();
      return NextResponse.json({ autoPushed: true });
    } else {
      // Just save the accumulated ready state
      await prisma.auctionState.update({
         where: { id: "global" },
         data: { readyTeams: readyTeams.join(',') }
      });
      return NextResponse.json({ 
        autoPushed: false, 
        readyCount: readyTeams.length, 
        total: activeTeams 
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
