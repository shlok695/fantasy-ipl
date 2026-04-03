const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { createPlayerPointsAudit } = require('../src/utils/pointsEngineCore');
const { recalculateLeagueTotalPoints } = require('../src/utils/teamScoreCore');
const { createMatchMetaFromRapidScorecard } = require('../src/lib/matchMeta');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function createEmptyStats() {
  return {
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    wickets: 0,
    oversBowled: 0,
    runsConceded: 0,
    maidens: 0,
    catches: 0,
    stumpings: 0,
    runOutsDirect: 0,
    runOutsIndirect: 0,
    lbwBowled: 0,
    dotBalls: 0,
    inStartingXI: true,
  };
}

function cleanPlayerName(value) {
  let name = String(value ?? '').trim();
  if (!name) return 'Unknown';

  name = name
    .replace(/â€ |â€¡/g, '')
    .replace(/[†\u2020\u2021]/g, '')
    .replace(/\(wk\)/gi, '')
    .replace(/\(c\)/gi, '')
    .replace(/\+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return name || 'Unknown';
}

function getOrCreateStats(playerStatsMap, name) {
  if (!playerStatsMap.has(name)) {
    playerStatsMap.set(name, createEmptyStats());
  }

  return playerStatsMap.get(name);
}

function applyDismissalFielding(playerStatsMap, dismissal) {
  const raw = String(dismissal || '').trim();
  if (!raw) return;

  const caughtAndBowled = raw.match(/\bc\s*(?:&|and)\s*b\s+(.+)/i);
  if (caughtAndBowled?.[1]) {
    const bowlerName = cleanPlayerName(caughtAndBowled[1]);
    if (bowlerName !== 'Unknown') {
      getOrCreateStats(playerStatsMap, bowlerName).catches += 1;
    }
    return;
  }

  const caughtWordy = raw.match(/\bcaught\s+(.+?)\s+bowled\s+/i);
  if (caughtWordy?.[1]) {
    const catcher = cleanPlayerName(caughtWordy[1]);
    if (catcher && catcher !== 'Unknown') {
      getOrCreateStats(playerStatsMap, catcher).catches += 1;
    }
    return;
  }

  const catcherMatch = raw.match(/(?:^|\s)c(?!aught)\s*(.+?)\s+b\s+/i);
  if (catcherMatch?.[1]) {
    let catcher = catcherMatch[1].trim();
    if (catcher.startsWith('sub (') || catcher.startsWith('sub(')) {
      catcher = catcher.replace(/sub\s*\(/, '').replace(/\)/, '').trim();
    }
    catcher = cleanPlayerName(catcher);
    if (catcher && catcher !== 'Unknown' && catcher !== '&' && catcher !== 'and') {
      getOrCreateStats(playerStatsMap, catcher).catches += 1;
    }
    return;
  }

  const stumperMatch = raw.match(/\bst\s*(.+?)\s+b\s+/i);
  if (stumperMatch?.[1]) {
    const stumper = cleanPlayerName(stumperMatch[1]);
    if (stumper && stumper !== 'Unknown') {
      getOrCreateStats(playerStatsMap, stumper).stumpings += 1;
    }
    return;
  }

  if (raw.toLowerCase().includes('run out')) {
    const runnerMatch = raw.match(/run out \((.*?)\)/i);
    if (runnerMatch?.[1]) {
      const throwers = runnerMatch[1]
        .split('/')
        .map((name) => cleanPlayerName(name))
        .filter((name) => Boolean(name) && name !== 'Unknown');

      if (throwers.length === 1) {
        getOrCreateStats(playerStatsMap, throwers[0]).runOutsDirect += 1;
      } else if (throwers.length > 1) {
        throwers.forEach((name) => {
          getOrCreateStats(playerStatsMap, name).runOutsIndirect += 1;
        });
      }
    }
    return;
  }

  if (raw.toLowerCase().includes('lbw') || raw.toLowerCase().startsWith('b ')) {
    const bowlerMatch = raw.match(/\bb\s+(.+)/i);
    if (bowlerMatch?.[1]) {
      const bowlerName = cleanPlayerName(bowlerMatch[1]);
      if (bowlerName && bowlerName !== 'Unknown') {
        getOrCreateStats(playerStatsMap, bowlerName).lbwBowled += 1;
      }
    }
  }
}

function mapRapidApiScorecard(data) {
  const scorecard = Array.isArray(data?.scorecard) ? data.scorecard : [];
  const playerStatsMap = new Map();

  for (const innings of scorecard) {
    const batsmen = Array.isArray(innings?.batsman) ? innings.batsman : [];
    for (const batter of batsmen) {
      const name = cleanPlayerName(String(batter?.name || batter?.nickname || 'Unknown'));
      if (!name || name === 'Unknown') continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.runs += Number(batter?.runs || batter?.r || 0);
      stats.ballsFaced += Number(batter?.balls || batter?.b || 0);
      stats.fours += Number(batter?.fours || batter?.['4s'] || 0);
      stats.sixes += Number(batter?.sixes || batter?.['6s'] || 0);
      stats.inStartingXI = true;

      if (batter?.outdec || batter?.outDesc) {
        applyDismissalFielding(playerStatsMap, String(batter?.outdec || batter?.outDesc));
      }
    }

    const bowlers = Array.isArray(innings?.bowler) ? innings.bowler : [];
    for (const bowler of bowlers) {
      const name = cleanPlayerName(String(bowler?.name || bowler?.nickname || 'Unknown'));
      if (!name || name === 'Unknown') continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.oversBowled += Number(bowler?.overs || bowler?.o || 0);
      stats.maidens += Number(bowler?.maidens || bowler?.m || 0);
      stats.runsConceded += Number(bowler?.runs || bowler?.r || 0);
      stats.wickets += Number(bowler?.wickets || bowler?.w || 0);
      stats.dotBalls = (stats.dotBalls || 0) + Number(bowler?.dots || bowler?.d || 0);
      stats.inStartingXI = true;
    }
  }

  return Array.from(playerStatsMap.entries())
    .map(([name, stats]) => ({ name, stats }))
    .filter((entry) => entry.name !== 'Unknown');
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactNormalizedName(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function consonantKey(value) {
  return normalizeName(value).replace(/[aeiou\s]/g, '');
}

function getNameParts(value) {
  return normalizeName(value).split(' ').filter(Boolean);
}

function getSharedPrefixLength(a, b) {
  const max = Math.min(a.length, b.length);
  let index = 0;
  while (index < max && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function pickBestPlayer(players, apiName) {
  const normalizedApiName = normalizeName(apiName);
  const compactApiName = compactNormalizedName(apiName);
  const parts = getNameParts(apiName);
  const firstName = parts[0] || '';
  const lastName = parts[parts.length - 1] || '';
  const apiLastNameKey = consonantKey(lastName);

  let bestCandidate = null;
  let bestScore = -1;
  let bestNonExternalCandidate = null;
  let bestNonExternalScore = -1;

  for (const player of players) {
    const normalizedCandidateName = normalizeName(player.name);
    const compactCandidateName = compactNormalizedName(player.name);
    const candidateParts = getNameParts(player.name);
    const candidateFirstName = candidateParts[0] || '';
    const candidateLastName = candidateParts[candidateParts.length - 1] || '';
    const sharedLastNamePrefix = lastName && candidateLastName
      ? getSharedPrefixLength(lastName, candidateLastName)
      : 0;
    const firstNameInitialMatch =
      firstName &&
      candidateFirstName &&
      ((firstName.length === 1 && candidateFirstName.startsWith(firstName)) ||
        (candidateFirstName.length === 1 && firstName.startsWith(candidateFirstName)));
    const candidateLastNameKey = consonantKey(candidateLastName);
    const lastNameKeyMatch =
      Boolean(apiLastNameKey) &&
      apiLastNameKey.length >= 5 &&
      candidateLastNameKey === apiLastNameKey;
    const isExternal =
      normalizeName(player.acquisition || '') === 'external';

    let score = 0;
    if (normalizedCandidateName === normalizedApiName) score += 100;
    if (compactCandidateName === compactApiName) score += 80;
    if (
      normalizedCandidateName.includes(normalizedApiName) ||
      normalizedApiName.includes(normalizedCandidateName)
    ) {
      score += 40;
    }
    if (firstName && candidateFirstName === firstName) score += 20;
    if (firstNameInitialMatch) score += 12;
    if (lastName && candidateLastName === lastName) score += 20;
    if (lastNameKeyMatch) score += 18;
    score += sharedLastNamePrefix * 2;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = player;
    }

    if (!isExternal && score > bestNonExternalScore) {
      bestNonExternalScore = score;
      bestNonExternalCandidate = player;
    }
  }

  function isStrongMatch(candidate) {
    if (!candidate) return false;
    const normalizedBestName = normalizeName(candidate.name);
    const compactBestName = compactNormalizedName(candidate.name);
    const bestParts = getNameParts(candidate.name);
    const bestFirstName = bestParts[0] || '';
    const bestLastName = bestParts[bestParts.length - 1] || '';
    const sharedLastNamePrefix = lastName && bestLastName
      ? getSharedPrefixLength(lastName, bestLastName)
      : 0;
    const firstNameInitialMatch =
      firstName &&
      bestFirstName &&
      ((firstName.length === 1 && bestFirstName.startsWith(firstName)) ||
        (bestFirstName.length === 1 && firstName.startsWith(bestFirstName)));
    const bestLastNameKey = consonantKey(bestLastName);
    const lastNameKeyMatch =
      Boolean(apiLastNameKey) &&
      apiLastNameKey.length >= 5 &&
      bestLastNameKey === apiLastNameKey;

    const strongFullNameMatch =
      normalizedBestName === normalizedApiName ||
      compactBestName === compactApiName ||
      normalizedBestName.includes(normalizedApiName) ||
      normalizedApiName.includes(normalizedBestName);
    const strongSplitNameMatch =
      firstName &&
      (bestFirstName === firstName || firstNameInitialMatch) &&
      (bestLastName === lastName || sharedLastNamePrefix >= 4 || lastNameKeyMatch);

    return strongFullNameMatch || strongSplitNameMatch;
  }

  if (bestNonExternalCandidate && isStrongMatch(bestNonExternalCandidate)) {
    return bestNonExternalCandidate;
  }

  if (bestCandidate && isStrongMatch(bestCandidate)) {
    return bestCandidate;
  }

  return null;
}

async function fetchRapidApiScorecard(matchId) {
  const apiKey = (process.env.RAPIDAPI_CRICBUZZ_KEY || process.env.RAPIDAPI_KEY || '').trim();
  const host = (process.env.RAPIDAPI_CRICBUZZ_HOST || process.env.RAPIDAPI_HOST || 'cricbuzz-cricket.p.rapidapi.com').trim();

  if (!apiKey) {
    throw new Error('Missing RapidAPI key');
  }

  const res = await fetch(`https://${host}/mcenter/v1/${matchId}/scard`, {
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': host,
      'x-rapidapi-key': apiKey,
    },
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Failed to fetch scorecard for match ${matchId}`);
  }

  return {
    scorecard: mapRapidApiScorecard(data),
    matchMeta: createMatchMetaFromRapidScorecard(matchId, data, 'rapidapi'),
  };
}

async function repairMatch(matchId) {
  const prisma = new PrismaClient();

  try {
    const { scorecard, matchMeta } = await fetchRapidApiScorecard(matchId);
    const allPlayers = await prisma.player.findMany({
      include: {
        captainOf: { select: { id: true } },
        viceCaptainOf: { select: { id: true } },
      },
    });

    const touchedTeamIds = new Set();
    const matchedPlayerIds = new Set();
    let updated = 0;

    if (matchMeta?.id) {
      await prisma.match.upsert({
        where: { id: matchMeta.id },
        update: {
          displayId: matchMeta.displayId ?? null,
          shortTitle: matchMeta.shortTitle ?? null,
          title: matchMeta.title ?? null,
          season: matchMeta.season ?? null,
          status: matchMeta.status ?? null,
          team1Code: matchMeta.team1Code ?? null,
          team2Code: matchMeta.team2Code ?? null,
          team1Name: matchMeta.team1Name ?? null,
          team2Name: matchMeta.team2Name ?? null,
          source: matchMeta.source ?? 'rapidapi',
          startedAt: matchMeta.startedAt ? new Date(matchMeta.startedAt) : null,
        },
        create: {
          id: matchMeta.id,
          displayId: matchMeta.displayId ?? null,
          shortTitle: matchMeta.shortTitle ?? null,
          title: matchMeta.title ?? null,
          season: matchMeta.season ?? null,
          status: matchMeta.status ?? null,
          team1Code: matchMeta.team1Code ?? null,
          team2Code: matchMeta.team2Code ?? null,
          team1Name: matchMeta.team1Name ?? null,
          team2Name: matchMeta.team2Name ?? null,
          source: matchMeta.source ?? 'rapidapi',
          startedAt: matchMeta.startedAt ? new Date(matchMeta.startedAt) : null,
        },
      });
    }

    for (const apiPlayer of scorecard) {
      const dbPlayer = pickBestPlayer(allPlayers, apiPlayer.name);
      if (!dbPlayer) continue;

      const fantasyStats = {
        ...apiPlayer.stats,
        isCaptain: Boolean(dbPlayer.captainOf),
        isViceCaptain: Boolean(dbPlayer.viceCaptainOf),
      };
      const audit = createPlayerPointsAudit(fantasyStats);

      const payload = {
        points: audit.finalPoints,
        runs: apiPlayer.stats.runs || 0,
        ballsFaced: apiPlayer.stats.ballsFaced || 0,
        wickets: apiPlayer.stats.wickets || 0,
        dotBalls: apiPlayer.stats.dotBalls || 0,
        breakdownJson: JSON.stringify(audit.breakdown),
        statsJson: JSON.stringify(audit.stats),
        scoreVersion: audit.scoreVersion,
        calculationHash: audit.calculationHash,
        source: 'repair:rapidapi',
      };

      const existing = await prisma.playerPoints.findUnique({
        where: {
          playerId_matchId: {
            playerId: dbPlayer.id,
            matchId,
          },
        },
      });

      if (existing) {
        await prisma.playerPoints.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await prisma.playerPoints.create({
          data: {
            playerId: dbPlayer.id,
            matchId,
            ...payload,
          },
        });
      }

      if (dbPlayer.userId) {
        touchedTeamIds.add(dbPlayer.userId);
      }
      matchedPlayerIds.add(dbPlayer.id);

      updated += 1;
    }

    const staleRows = await prisma.playerPoints.findMany({
      where: {
        matchId,
        playerId: {
          notIn: [...matchedPlayerIds],
        },
      },
      select: {
        id: true,
        player: {
          select: {
            userId: true,
          },
        },
      },
    });

    for (const staleRow of staleRows) {
      await prisma.playerPoints.delete({
        where: { id: staleRow.id },
      });

      if (staleRow.player?.userId) {
        touchedTeamIds.add(staleRow.player.userId);
      }
    }

    await recalculateLeagueTotalPoints(prisma);

    return { matchId, updated };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  loadEnv();

  const matchIds = process.argv.slice(2).map((value) => String(value).trim()).filter(Boolean);
  if (matchIds.length === 0) {
    throw new Error('Provide at least one match ID. Example: node scripts/repair-match-points.js 149629 149618');
  }

  const results = [];
  for (const matchId of matchIds) {
    results.push(await repairMatch(matchId));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
