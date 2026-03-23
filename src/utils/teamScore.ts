import { PrismaClient } from '@prisma/client';

export async function recalculateTeamTotalPoints(teamId: string, tx: any) {
  // 1. Fetch all players belonging to the team with their points records
  const players = await tx.player.findMany({
    where: { userId: teamId },
    include: { points: true }
  });

  // 2. Calculate total points earned by each player
  const playerTotals = players.map((p: any) => {
    return p.points.reduce((sum: number, pt: any) => sum + pt.points, 0);
  });

  // 3. Sort the totals descending so the highest scoring players are first
  playerTotals.sort((a: number, b: number) => b - a);

  // 4. Take only the Top 11 players
  const top11Totals = playerTotals.slice(0, 11);

  // 5. Aggregate the score of those top 11
  const top11Total = top11Totals.reduce((sum: number, p: number) => sum + p, 0);

  // 6. Get user's bonus points (team wins)
  const user = await tx.user.findUnique({ where: { id: teamId } });
  const finalTotal = top11Total + (user?.bonusPoints || 0);

  // 7. Save the new aggregate to the Team database record
  await tx.user.update({
    where: { id: teamId },
    data: { totalPoints: finalTotal }
  });

  return finalTotal;
}
