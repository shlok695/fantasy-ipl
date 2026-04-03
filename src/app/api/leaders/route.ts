import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AggregatedLeader = {
  id: string;
  name: string;
  role?: string | null;
  iplTeam?: string | null;
  auctionPrice?: number | null;
  user?: { name?: string | null } | null;
  points?: [];
  totalPoints: number;
  totalRuns: number;
  totalWickets: number;
  totalDotBalls: number;
  innings50s: number;
  innings100s: number;
  matches: number;
  sr: number;
};

function isCompletedMatch(status?: string | null) {
  return typeof status === "string" && /\bwon\b/i.test(status);
}

function pickLeader(
  players: AggregatedLeader[],
  metric: "totalRuns" | "totalWickets"
) {
  return players
    .filter((player) => Number(player[metric] || 0) > 0)
    .sort((left, right) => {
      const delta = Number(right[metric] || 0) - Number(left[metric] || 0);
      if (delta !== 0) return delta;
      return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
    })[0] || null;
}

export async function GET() {
  try {
    const rows = await prisma.playerPoints.findMany({
      where: {
        player: { role: { not: "IPL TEAM" } },
      },
      select: {
        points: true,
        runs: true,
        ballsFaced: true,
        wickets: true,
        dotBalls: true,
        match: { select: { status: true } },
        player: {
          select: {
            id: true,
            name: true,
            role: true,
            iplTeam: true,
            auctionPrice: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    const totals = new Map<
      string,
      AggregatedLeader & { totalBallsFaced: number }
    >();

    for (const row of rows) {
      if (!isCompletedMatch(row.match?.status ?? null)) {
        continue;
      }

      const playerId = row.player.id;
      const existing = totals.get(playerId);
      const runs = row.runs || 0;
      const ballsFaced = row.ballsFaced || 0;
      const wickets = row.wickets || 0;
      const dotBalls = row.dotBalls || 0;
      const points = row.points || 0;

      if (!existing) {
        totals.set(playerId, {
          id: playerId,
          name: row.player.name,
          role: row.player.role,
          iplTeam: row.player.iplTeam,
          auctionPrice: row.player.auctionPrice,
          user: row.player.user ? { name: row.player.user.name } : null,
          points: [],
          totalPoints: points,
          totalRuns: runs,
          totalWickets: wickets,
          totalDotBalls: dotBalls,
          innings50s: runs >= 50 && runs < 100 ? 1 : 0,
          innings100s: runs >= 100 ? 1 : 0,
          matches: 1,
          sr: 0,
          totalBallsFaced: ballsFaced,
        });
        continue;
      }

      existing.totalPoints += points;
      existing.totalRuns += runs;
      existing.totalWickets += wickets;
      existing.totalDotBalls += dotBalls;
      existing.totalBallsFaced += ballsFaced;
      existing.matches += 1;
      if (runs >= 100) existing.innings100s += 1;
      else if (runs >= 50) existing.innings50s += 1;
    }

    const players: AggregatedLeader[] = [...totals.values()].map((entry) => {
      const { totalBallsFaced, ...rest } = entry;
      return {
        ...rest,
        sr: totalBallsFaced > 0 ? (rest.totalRuns / totalBallsFaced) * 100 : 0,
      };
    });

    const orangeCapHolder = pickLeader(players, "totalRuns");
    const purpleCapHolder = pickLeader(players, "totalWickets");

    return NextResponse.json({
      orangeCapHolder,
      purpleCapHolder,
      matchFilter: "status includes 'won'",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
