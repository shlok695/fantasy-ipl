import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLiveMatchStats } from '@/lib/cricketApi';
import { calculateDream11Points } from '@/utils/pointsEngine';
import { recalculateTeamTotalPoints } from '@/utils/teamScore';
import { recordAdminAudit } from '@/lib/adminAudit';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.name !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    // 1. Fetch scorecard from the 3rd party API (or Mock)
    const scorecard = await fetchLiveMatchStats(matchId);
    let successfullyMatched = 0;

    // 2. Wrap the DB updates in a Transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      
      const modifiedTeams = new Set<string>();
      
      // Before adding, ensure we haven't already synced this match
      const existingMatchPoints = await tx.playerPoints.findFirst({
        where: { matchId: matchId }
      });

      if (existingMatchPoints) {
        throw new Error(`Match ${matchId} has already been synced!`);
      }

      // Process each player from the API scorecard
      for (const apiPlayer of scorecard) {
        // Calculate points based on robust Dream11 Engine
        const pointsGenerated = calculateDream11Points(apiPlayer.stats);

        // Try to find the player in our database by matching names 
        // Note: Real APIs sometimes send "M S Dhoni" vs "MS Dhoni", so simple matching 
        // might require fuzzy search in production, but we will use exact match for now.
        const dbPlayer = await tx.player.findFirst({
          where: { name: { contains: apiPlayer.name } }
        });

        if (dbPlayer) {
          // 3. Create the PlayerPoints record with the matchId
          await tx.playerPoints.create({
            data: {
              playerId: dbPlayer.id,
              points: pointsGenerated,
              matchId: matchId,
              runs: apiPlayer.stats.runs || 0,
              ballsFaced: apiPlayer.stats.ballsFaced || 0,
              wickets: apiPlayer.stats.wickets || 0,
              dotBalls: apiPlayer.stats.dotBalls || 0,
            }
          });

          // 4. Mark the team to be recalculated
          if (dbPlayer.userId) {
            modifiedTeams.add(dbPlayer.userId);
          }
          successfullyMatched++;
        }
      }

      // 5. Recalculate Top 11 Scores for all affected Teams
      for (const teamId of Array.from(modifiedTeams)) {
        await recalculateTeamTotalPoints(teamId, tx);
      }
    });

    await recordAdminAudit(
      session.user!.name || 'admin',
      'MATCH_SYNC',
      `match:${matchId} players:${successfullyMatched}`
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${successfullyMatched} players from match ${matchId}.`
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
