const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { calculateDream11Breakdown } = require('../src/utils/pointsEngineCore');
const { createMatchMetaFromRapidScorecard, createMatchMetaRecord } = require('../src/lib/matchMeta');

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
    .replace(/^\(\s*sub\s*\)\s*/i, '')
    .replace(/^sub(?:stitute)?\s*\(\s*(.*?)\s*\)\s*$/i, '$1')
    .replace(/^sub(?:stitute)?\s+/i, '')
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

function mapCricApiScorecard(scorecardArray) {
  const playerStatsMap = new Map();

  for (const inning of scorecardArray) {
    const batting = Array.isArray(inning?.batting) ? inning.batting : [];
    for (const batter of batting) {
      const name = cleanPlayerName(batter?.batsman?.name || 'Unknown');
      if (!name || name === 'Unknown') continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.runs += Number(batter?.r || 0);
      stats.ballsFaced += Number(batter?.b || 0);
      stats.fours += Number(batter?.['4s'] || 0);
      stats.sixes += Number(batter?.['6s'] || 0);
      stats.inStartingXI = true;
      applyDismissalFielding(playerStatsMap, String(batter?.dismissalText || batter?.['dismissal-text'] || batter?.dismissal || ''));
    }

    const bowling = Array.isArray(inning?.bowling) ? inning.bowling : [];
    for (const bowler of bowling) {
      const name = cleanPlayerName(bowler?.bowler?.name || 'Unknown');
      if (!name || name === 'Unknown') continue;

      const stats = getOrCreateStats(playerStatsMap, name);
      stats.oversBowled += Number(bowler?.o || 0);
      stats.maidens += Number(bowler?.m || 0);
      stats.runsConceded += Number(bowler?.r || 0);
      stats.wickets += Number(bowler?.w || 0);
      stats.dotBalls = (stats.dotBalls || 0) + Number(bowler?.d || bowler?.['0s'] || 0);
      stats.inStartingXI = true;
    }
  }

  return Array.from(playerStatsMap.entries())
    .map(([name, stats]) => ({ name, stats }))
    .filter((entry) => entry.name !== 'Unknown');
}

function getRapidApiConfig() {
  const apiKey = (process.env.RAPIDAPI_CRICBUZZ_KEY || process.env.RAPIDAPI_KEY || '').trim();
  const host = (process.env.RAPIDAPI_CRICBUZZ_HOST || process.env.RAPIDAPI_HOST || 'cricbuzz-cricket.p.rapidapi.com').trim();
  return { apiKey, host };
}

function getCricApiConfig() {
  const apiKey = (process.env.CRICKET_API_KEY || '').trim();
  const isConfigured =
    Boolean(apiKey) &&
    apiKey !== 'your_api_key_here' &&
    !apiKey.includes('msh');

  return { apiKey, isConfigured };
}

function isRapidApiMatchId(matchId) {
  return /^\d+$/.test(String(matchId || '').trim());
}

function extractCricApiMatchPayload(data) {
  if (data?.data && !Array.isArray(data.data) && typeof data.data === 'object') {
    return data.data;
  }

  if (Array.isArray(data?.data) && data.data[0] && typeof data.data[0] === 'object') {
    return data.data[0];
  }

  if (data && typeof data === 'object') {
    return data;
  }

  return null;
}

async function fetchScorecardForCalculations(matchId) {
  const rapidApi = getRapidApiConfig();
  const cricApi = getCricApiConfig();
  const rapidApiCompatibleMatchId = isRapidApiMatchId(matchId);

  if (rapidApiCompatibleMatchId && rapidApi.apiKey) {
    const res = await fetch(`https://${rapidApi.host}/mcenter/v1/${matchId}/scard`, {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': rapidApi.host,
        'x-rapidapi-key': rapidApi.apiKey,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || `Failed to fetch scorecard for match ${matchId}`);
    }

    return {
      provider: 'rapidapi',
      rawData: data,
      statusText: String(data?.status || '').trim() || 'Unknown',
      scorecard: mapRapidApiScorecard(data),
      matchMeta: createMatchMetaFromRapidScorecard(matchId, data, 'rapidapi'),
    };
  }

  if (!cricApi.isConfigured) {
    throw new Error('Missing CRICKET_API_KEY for non-numeric match IDs');
  }

  const res = await fetch(`https://api.cricapi.com/v1/match_scorecard?id=${matchId}&apikey=${cricApi.apiKey}`, {
    cache: 'no-store',
  });
  const data = await res.json();
  const payload = extractCricApiMatchPayload(data);
  const scorecard = Array.isArray(payload?.scorecard)
    ? payload.scorecard
    : Array.isArray(payload?.scoreCard)
      ? payload.scoreCard
      : [];

  if (!res.ok || data?.status !== 'success' || !payload || scorecard.length === 0) {
    throw new Error(data?.reason || `Failed to fetch scorecard for match ${matchId}`);
  }

  const teamInfo = Array.isArray(payload?.teamInfo) ? payload.teamInfo : [];
  const teamNames = Array.isArray(payload?.teams) ? payload.teams : [];
  const team1Name = teamNames[0] || teamInfo[0]?.name || payload?.team1 || payload?.team1Name || null;
  const team2Name = teamNames[1] || teamInfo[1]?.name || payload?.team2 || payload?.team2Name || null;
  const team1Code = teamInfo.find((entry) => entry?.name === team1Name)?.shortname || teamInfo[0]?.shortname || null;
  const team2Code = teamInfo.find((entry) => entry?.name === team2Name)?.shortname || teamInfo[1]?.shortname || null;

  return {
    provider: 'cricapi',
    rawData: data,
    statusText: String(payload?.status || data?.reason || '').trim() || 'Unknown',
    scorecard: mapCricApiScorecard(scorecard),
    matchMeta: createMatchMetaRecord(matchId, {
      title: payload?.name || null,
      shortTitle: team1Code && team2Code ? `${team1Code} vs ${team2Code}` : null,
      status: payload?.status || data?.reason || null,
      team1Code,
      team2Code,
      team1Name,
      team2Name,
      season: payload?.series_name || payload?.series || null,
      startedAt: payload?.dateTimeGMT || payload?.date || null,
      source: 'cricapi',
    }),
  };
}

function normalizeName(value) {
  return String(value || '')
    .replace(/^\(\s*sub\s*\)\s*/i, '')
    .replace(/^sub(?:stitute)?\s*\(\s*(.*?)\s*\)\s*$/i, '$1')
    .replace(/^sub(?:stitute)?\s+/i, '')
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

async function main() {
  loadEnv();

  const matchId = String(process.argv[2] || '').trim();
  if (!matchId) {
    throw new Error('Usage: node scripts/generate-match-calculations.js <matchId>');
  }

  const outputPath = path.resolve(__dirname, `../docs/match-${matchId}-calculations.md`);
  const result = await fetchScorecardForCalculations(matchId);
  const { rawData, statusText, scorecard, matchMeta } = result;
  const prisma = new PrismaClient();

  try {
    const allPlayers = await prisma.player.findMany({
      include: {
        user: { select: { name: true } },
        captainOf: { select: { id: true } },
        viceCaptainOf: { select: { id: true } },
        points: { where: { matchId } },
      },
    });

    const sections = [];
    const unmatched = [];

    for (const apiPlayer of scorecard) {
      const dbPlayer = pickBestPlayer(allPlayers, apiPlayer.name);
      if (!dbPlayer) {
        unmatched.push(apiPlayer.name);
        continue;
      }

      const multiplierLabel = dbPlayer.captainOf ? 'Captain' : dbPlayer.viceCaptainOf ? 'Vice Captain' : 'Normal';
      const stats = {
        ...apiPlayer.stats,
        isCaptain: Boolean(dbPlayer.captainOf),
        isViceCaptain: Boolean(dbPlayer.viceCaptainOf),
      };
      const breakdown = calculateDream11Breakdown(stats);
      const syncedRow = dbPlayer.points[0] || null;

      sections.push({
        apiName: apiPlayer.name,
        dbName: dbPlayer.name,
        owner: dbPlayer.user?.name || 'Unsold / No owner',
        multiplierLabel,
        stats,
        breakdown,
        storedPoints: syncedRow?.points ?? null,
      });
    }

    sections.sort((a, b) => b.breakdown.finalPoints - a.breakdown.finalPoints);

    const lines = [];
    lines.push(`# Match ${matchId} Player Calculations`);
    lines.push('');
    if (matchMeta?.shortTitle || matchMeta?.displayId) {
      lines.push(`Match Label: ${matchMeta.shortTitle || matchMeta.displayId}${matchMeta?.displayId && matchMeta.shortTitle !== matchMeta.displayId ? ` (${matchMeta.displayId})` : ''}`);
      lines.push('');
    }
    lines.push(`Provider: ${String(result.provider || 'unknown').toUpperCase()}`);
    lines.push('');
    lines.push(`Status: ${statusText || String(rawData?.status || 'Unknown')}`);
    lines.push('');
    lines.push('Scoring Formula Used:');
    lines.push('- runs x 1');
    lines.push('- fours x 1');
    lines.push('- sixes x 2');
    lines.push('- 30 run bonus = 4, 50 run bonus = 8, 100 run bonus = 16');
    lines.push('- duck = -2 if out for 0 after facing a ball');
    lines.push('- strike-rate bonus/penalty only if balls faced >= 10');
    lines.push('- wickets x 25');
    lines.push('- lbw/bowled wicket x 8');
    lines.push('- 3 wicket bonus = 4, 4 wicket bonus = 12, 5 wicket bonus = 16');
    lines.push('- maiden over x 12');
    lines.push('- economy bonus/penalty only if overs bowled >= 2');
    lines.push('- catch x 8, 3 catch bonus = 4');
    lines.push('- stumping x 12');
    lines.push('- direct run-out x 12, indirect run-out x 6');
    lines.push('- playing XI = 4');
    lines.push('- captain = 2x total, vice captain = 1.5x total');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| Player | Owner | Role Multiplier | Calculated Points | Stored Points |');
    lines.push('| --- | --- | --- | ---: | ---: |');
    for (const section of sections) {
      const storedPoints = section.storedPoints == null ? '-' : section.storedPoints;
      lines.push(`| ${section.dbName} | ${section.owner} | ${section.multiplierLabel} | ${section.breakdown.finalPoints} | ${storedPoints} |`);
    }
    lines.push('');

    for (const section of sections) {
      lines.push(`## ${section.dbName}`);
      lines.push('');
      if (section.apiName !== section.dbName) {
        lines.push(`API name: \`${section.apiName}\``);
        lines.push('');
      }
      lines.push(`Owner: ${section.owner}`);
      lines.push('');
      lines.push(`Multiplier: ${section.multiplierLabel}`);
      lines.push('');
      lines.push(`Stats: runs ${section.stats.runs}, balls ${section.stats.ballsFaced}, fours ${section.stats.fours}, sixes ${section.stats.sixes}, wickets ${section.stats.wickets}, overs ${section.stats.oversBowled}, runs conceded ${section.stats.runsConceded}, maidens ${section.stats.maidens}, catches ${section.stats.catches}, stumpings ${section.stats.stumpings}, direct run outs ${section.stats.runOutsDirect}, indirect run outs ${section.stats.runOutsIndirect}, lbw/bowled wickets ${section.stats.lbwBowled}.`);
      lines.push('');
      lines.push('| Component | Points |');
      lines.push('| --- | ---: |');
      for (const line of section.breakdown.lines) {
        lines.push(`| ${line.label} | ${line.value} |`);
      }
      lines.push(`| Subtotal before multiplier | ${section.breakdown.subtotal} |`);
      if (section.breakdown.multiplierValue !== 1) {
        lines.push(`| Multiplier (${section.breakdown.multiplierLabel} x${section.breakdown.multiplierValue}) | applied |`);
      }
      lines.push(`| Calculated final points | ${section.breakdown.finalPoints} |`);
      if (section.storedPoints != null) {
        lines.push(`| Stored DB points | ${section.storedPoints} |`);
        if (section.storedPoints !== section.breakdown.finalPoints) {
          lines.push(`| Stored vs calculated mismatch | ${section.storedPoints - section.breakdown.finalPoints} |`);
        }
      }
      lines.push('');
    }

    if (unmatched.length > 0) {
      lines.push('## Unmatched API Players');
      lines.push('');
      for (const name of unmatched) {
        lines.push(`- ${name}`);
      }
      lines.push('');
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
    console.log(outputPath);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
