const { PrismaClient } = require("@prisma/client");
const { calculateDream11Points } = require("../../src/utils/pointsEngineCore");
const { recalculateTeamsByIds } = require("../../src/utils/teamScoreCore");
const { simulatedIplMatches, uiVerificationChecklist } = require("../data/simulatedIplMatches");

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {
    dryRun: false,
    batchId: null,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg.startsWith("--batch-id=")) {
      args.batchId = arg.split("=")[1] || null;
    } else if (arg.startsWith("--batch=")) {
      args.batchId = arg.split("=")[1] || null;
    }
  }

  return args;
}

function createSimulationBatchId() {
  const iso = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `sim-${iso}`;
}

function groupTotalsByUser(adjustments) {
  return adjustments.reduce((accumulator, adjustment) => {
    accumulator[adjustment.userId] = (accumulator[adjustment.userId] || 0) + adjustment.points;
    return accumulator;
  }, {});
}

async function buildSimulationPayload(batchId) {
  const users = await prisma.user.findMany({
    where: { name: { not: "admin" } },
    select: { id: true, name: true, iplTeam: true },
    orderBy: { name: "asc" },
  });

  const soldPlayers = await prisma.player.findMany({
    where: {
      userId: { not: null },
      role: { not: "IPL TEAM" },
    },
    select: {
      id: true,
      name: true,
      userId: true,
      iplTeam: true,
      user: { select: { name: true } },
    },
  });

  const playerByName = new Map(
    soldPlayers.map((player) => [player.name.toLowerCase(), player])
  );

  const usersByIplTeam = new Map();
  for (const user of users) {
    if (!user.iplTeam) continue;
    if (!usersByIplTeam.has(user.iplTeam)) {
      usersByIplTeam.set(user.iplTeam, []);
    }
    usersByIplTeam.get(user.iplTeam).push(user);
  }

  const playerPointCreates = [];
  const bonusAdjustments = [];
  const skippedPlayers = [];
  const matchSummaries = [];
  const affectedTeamIds = new Set();
  const playerIdsAffected = new Set();
  const playerNamesAffected = new Set();

  for (const match of simulatedIplMatches) {
    let matchedEntries = 0;
    let generatedPoints = 0;

    for (const entry of match.entries) {
      const player = playerByName.get(entry.playerName.toLowerCase());
      if (!player || !player.userId) {
        skippedPlayers.push({
          matchId: match.matchId,
          playerName: entry.playerName,
          reason: !player ? "Player not found in sold squads" : "Player is not assigned to a fantasy team",
        });
        continue;
      }

      const fantasyPoints = calculateDream11Points(entry.stats);

      playerPointCreates.push({
        playerId: player.id,
        simulationBatchId: batchId,
        matchId: match.matchId,
        points: fantasyPoints,
        runs: entry.stats.runs || 0,
        ballsFaced: entry.stats.ballsFaced || 0,
        wickets: entry.stats.wickets || 0,
        dotBalls: entry.stats.dotBalls || 0,
        createdAt: new Date(match.playedAt),
      });

      matchedEntries += 1;
      generatedPoints += fantasyPoints;
      affectedTeamIds.add(player.userId);
      playerIdsAffected.add(player.id);
      playerNamesAffected.add(player.name);
    }

    const bonusRecipients = usersByIplTeam.get(match.winner) || [];
    for (const recipient of bonusRecipients) {
      bonusAdjustments.push({
        simulationBatchId: batchId,
        userId: recipient.id,
        matchId: match.matchId,
        iplTeam: match.winner,
        points: 50,
        createdAt: new Date(match.playedAt),
      });
      affectedTeamIds.add(recipient.id);
    }

    matchSummaries.push({
      matchId: match.matchId,
      referenceLabel: match.referenceLabel,
      winner: match.winner,
      matchedEntries,
      generatedPoints,
      bonusRecipients: bonusRecipients.map((user) => user.name),
    });
  }

  return {
    batchId,
    users,
    playerPointCreates,
    bonusAdjustments,
    skippedPlayers,
    matchSummaries,
    affectedTeamIds: Array.from(affectedTeamIds),
    playerIdsAffected: Array.from(playerIdsAffected),
    playerNamesAffected: Array.from(playerNamesAffected),
  };
}

function printSimulationSummary(payload, dryRun) {
  console.log("");
  console.log(dryRun ? "SIMULATION DRY RUN" : "SIMULATION APPLIED");
  console.log(`Batch ID: ${payload.batchId}`);
  console.log(`Matches referenced: ${payload.matchSummaries.length}`);
  console.log(`Player point rows: ${payload.playerPointCreates.length}`);
  console.log(`Players affected: ${payload.playerNamesAffected.length}`);
  console.log(`Fantasy teams affected: ${payload.affectedTeamIds.length}`);
  console.log(`Partner-team bonus rows: ${payload.bonusAdjustments.length}`);
  if (payload.skippedPlayers.length > 0) {
    console.log(`Skipped entries: ${payload.skippedPlayers.length}`);
  }

  console.log("");
  console.log("Match Summary:");
  for (const match of payload.matchSummaries) {
    console.log(`- ${match.matchId}: ${match.referenceLabel} | winner ${match.winner} | player rows ${match.matchedEntries} | bonus teams ${match.bonusRecipients.length}`);
  }

  if (payload.skippedPlayers.length > 0) {
    console.log("");
    console.log("Skipped Players:");
    for (const skipped of payload.skippedPlayers.slice(0, 12)) {
      console.log(`- ${skipped.matchId}: ${skipped.playerName} (${skipped.reason})`);
    }
    if (payload.skippedPlayers.length > 12) {
      console.log(`- ...and ${payload.skippedPlayers.length - 12} more`);
    }
  }

  console.log("");
  console.log("Manual UI Verification:");
  for (const item of uiVerificationChecklist) {
    console.log(`- ${item}`);
  }
  console.log("");
}

async function applySimulation(payload, dryRun) {
  if (dryRun) {
    printSimulationSummary(payload, true);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.simulationBatch.create({
      data: {
        id: payload.batchId,
        label: "Two-week IPL simulation",
        sourceSeason: "IPL 2025",
        notes: "Curated developer test batch using early-season reference matches.",
      },
    });

    if (payload.playerPointCreates.length > 0) {
      await tx.playerPoints.createMany({
        data: payload.playerPointCreates,
      });
    }

    if (payload.bonusAdjustments.length > 0) {
      await tx.simulationTeamBonusAdjustment.createMany({
        data: payload.bonusAdjustments,
      });

      const groupedAdjustments = groupTotalsByUser(payload.bonusAdjustments);
      for (const [userId, points] of Object.entries(groupedAdjustments)) {
        await tx.user.update({
          where: { id: userId },
          data: { bonusPoints: { increment: points } },
        });
      }
    }

    await recalculateTeamsByIds(payload.affectedTeamIds, tx);
  });

  printSimulationSummary(payload, false);
}

async function getCleanupBatch(batchId) {
  if (batchId) {
    return prisma.simulationBatch.findUnique({
      where: { id: batchId },
    });
  }

  return prisma.simulationBatch.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

async function buildCleanupPayload(batchId) {
  const batch = await getCleanupBatch(batchId);
  if (!batch) {
    return null;
  }

  const playerPoints = await prisma.playerPoints.findMany({
    where: { simulationBatchId: batch.id },
    select: {
      id: true,
      player: {
        select: {
          userId: true,
        },
      },
    },
  });

  const bonusAdjustments = await prisma.simulationTeamBonusAdjustment.findMany({
    where: { simulationBatchId: batch.id },
    select: {
      id: true,
      userId: true,
      points: true,
      matchId: true,
      iplTeam: true,
    },
  });

  const affectedTeamIds = new Set();
  for (const point of playerPoints) {
    if (point.player.userId) {
      affectedTeamIds.add(point.player.userId);
    }
  }
  for (const adjustment of bonusAdjustments) {
    affectedTeamIds.add(adjustment.userId);
  }

  return {
    batch,
    playerPoints,
    bonusAdjustments,
    affectedTeamIds: Array.from(affectedTeamIds),
  };
}

function printCleanupSummary(payload, dryRun) {
  console.log("");
  console.log(dryRun ? "SIMULATION CLEANUP DRY RUN" : "SIMULATION CLEANUP APPLIED");
  console.log(`Batch ID: ${payload.batch.id}`);
  console.log(`Tagged player point rows to remove: ${payload.playerPoints.length}`);
  console.log(`Tagged bonus adjustment rows to remove: ${payload.bonusAdjustments.length}`);
  console.log(`Fantasy teams to recalculate: ${payload.affectedTeamIds.length}`);
  console.log("");
}

async function clearSimulation(batchId, dryRun) {
  const payload = await buildCleanupPayload(batchId);
  if (!payload) {
    console.log("No simulation batch found to clear.");
    return;
  }

  printCleanupSummary(payload, dryRun);

  if (dryRun) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.playerPoints.deleteMany({
      where: { simulationBatchId: payload.batch.id },
    });

    const groupedAdjustments = groupTotalsByUser(payload.bonusAdjustments);
    for (const [userId, points] of Object.entries(groupedAdjustments)) {
      await tx.user.update({
        where: { id: userId },
        data: { bonusPoints: { decrement: points } },
      });
    }

    await tx.simulationTeamBonusAdjustment.deleteMany({
      where: { simulationBatchId: payload.batch.id },
    });

    await tx.simulationBatch.delete({
      where: { id: payload.batch.id },
    });

    await recalculateTeamsByIds(payload.affectedTeamIds, tx);
  });

  console.log("Simulation data removed. Real data remains untouched.");
  console.log("");
}

async function disconnectPrisma() {
  await prisma.$disconnect();
}

module.exports = {
  applySimulation,
  buildSimulationPayload,
  clearSimulation,
  createSimulationBatchId,
  disconnectPrisma,
  parseArgs,
};

