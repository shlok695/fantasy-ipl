import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLiveMatchStats } from '@/lib/cricketApi';
import { hasAdminAuditAction, recordAdminAudit } from '@/lib/adminAudit';
import { formatSeasonAwardAuditDetails, getSeasonAwardBonusByTeam, getSeasonAwardWinners } from '@/lib/seasonAwards';
import { calculateDream11Points } from '@/utils/pointsEngine';
import { recalculateLeagueTotalPoints, recalculateTeamTotalPoints } from '@/utils/teamScore';

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
    let seasonAwardWinners: ReturnType<typeof getSeasonAwardWinners> = [];
    const shouldAutoApplySeasonAwards = process.env.SEASON_FINAL_MATCH_ID === String(matchId);
    const seasonAwardsAlreadyApplied = shouldAutoApplySeasonAwards ? await hasAdminAuditAction('SEASON_AWARDS_APPLIED') : false;

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

      if (shouldAutoApplySeasonAwards && !seasonAwardsAlreadyApplied) {
        const players = await tx.player.findMany({
          where: { userId: { not: null }, role: { not: 'IPL TEAM' } },
          select: {
            id: true,
            name: true,
            userId: true,
            user: { select: { name: true } },
            points: {
              select: {
                points: true,
                runs: true,
                wickets: true,
              }
            }
          }
        });

        seasonAwardWinners = getSeasonAwardWinners(players);

        const bonusByTeam = getSeasonAwardBonusByTeam(seasonAwardWinners);
        for (const [teamId, points] of bonusByTeam.entries()) {
          await tx.user.update({
            where: { id: teamId },
            data: { bonusPoints: { increment: points } }
          });
        }

        if (seasonAwardWinners.length > 0) {
          await recalculateLeagueTotalPoints(tx);
        }
      }
    });

    await recordAdminAudit(
      session.user!.name || 'admin',
      'MATCH_SYNC',
      `match:${matchId} players:${successfullyMatched}`
    );

    if (seasonAwardWinners.length > 0) {
      await recordAdminAudit(
        session.user!.name || 'admin',
        'SEASON_AWARDS_APPLIED',
        formatSeasonAwardAuditDetails(seasonAwardWinners)
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${successfullyMatched} players from match ${matchId}.${seasonAwardWinners.length > 0 ? ' Season-end awards were applied automatically.' : ''}`
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
