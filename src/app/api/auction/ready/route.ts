import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pushNextPlayer } from "@/lib/auctionEngine";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).id) {
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

    // Count active participating franchises (exclude 'admin' and only those active in the last 30s)
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    const activeTeams = await prisma.user.count({ 
      where: { 
        name: { not: "admin" },
        lastActive: { gte: thirtySecondsAgo }
      } 
    });

    // If no teams exist, or everyone is ready, push next!
    if (activeTeams === 0 || readyTeams.length >= activeTeams) {
      console.log(`[Consensus Reached] ${readyTeams.length}/${activeTeams} ready. Pushing next player...`);
      await pushNextPlayer();
      return NextResponse.json({ autoPushed: true });
    } else {
      // Find who is missing for admin visibility if needed
      const allUsers = await prisma.user.findMany({ where: { name: { not: "admin" } } });
      const missing = allUsers.filter(u => !readyTeams.includes(u.id)).map(u => u.name);
      console.log(`[Consensus Progress] ${readyTeams.length}/${activeTeams} ready. Missing: ${missing.join(', ')}`);

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
