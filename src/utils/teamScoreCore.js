async function recalculateTeamTotalPoints(teamId, tx) {
  const players = await tx.player.findMany({
    where: { userId: teamId },
    include: { points: true },
  });

  const playerTotals = players.map((player) => {
    return player.points.reduce((sum, pointEntry) => sum + pointEntry.points, 0);
  });

  playerTotals.sort((a, b) => b - a);

  const top11Total = playerTotals.slice(0, 11).reduce((sum, playerPoints) => sum + playerPoints, 0);
  const user = await tx.user.findUnique({ where: { id: teamId } });
  const finalTotal = top11Total + (user?.bonusPoints || 0);

  await tx.user.update({
    where: { id: teamId },
    data: { totalPoints: finalTotal },
  });

  return finalTotal;
}

async function recalculateTeamsByIds(teamIds, tx) {
  for (const teamId of teamIds) {
    await recalculateTeamTotalPoints(teamId, tx);
  }
}

module.exports = {
  recalculateTeamTotalPoints,
  recalculateTeamsByIds,
};

