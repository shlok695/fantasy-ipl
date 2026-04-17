const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const path = require("path");

const prisma = new PrismaClient();

const IPL_TEAM_CODE_ALIASES = {
  csk: "CSK",
  "chennai super kings": "CSK",
  dc: "DC",
  "delhi capitals": "DC",
  gt: "GT",
  "gujarat titans": "GT",
  kkr: "KKR",
  "kolkata knight riders": "KKR",
  lsg: "LSG",
  "lucknow super giants": "LSG",
  mi: "MI",
  "mumbai indians": "MI",
  pbks: "PBKS",
  "punjab kings": "PBKS",
  rr: "RR",
  "rajasthan royals": "RR",
  rcb: "RCB",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  srh: "SRH",
  "sunrisers hyderabad": "SRH",
};

function normalizeTeamCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const compact = raw.toUpperCase().replace(/\s+/g, "");
  if (Object.values(IPL_TEAM_CODE_ALIASES).includes(compact)) {
    return compact;
  }

  return IPL_TEAM_CODE_ALIASES[raw.toLowerCase()] || null;
}

function isSharedResult(statusText) {
  return /\b(no result|abandon(?:ed)?|washout)\b/.test(String(statusText || "").toLowerCase());
}

function detectWinningTeam(statusText) {
  const candidateText = String(statusText || "").toLowerCase();
  if (!candidateText.includes("won")) return null;

  for (const [needle, code] of Object.entries(IPL_TEAM_CODE_ALIASES)) {
    if (candidateText.includes(needle)) {
      return code;
    }
  }

  return null;
}

function getMatchSortValue(entry) {
  const startedAt = entry?.match?.startedAt ? new Date(entry.match.startedAt).getTime() : Number.NaN;
  if (Number.isFinite(startedAt)) return startedAt;

  const createdAt = entry?.createdAt ? new Date(entry.createdAt).getTime() : 0;
  if (Number.isFinite(createdAt) && createdAt > 0) return createdAt;

  const updatedAt = entry?.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt;

  return 0;
}

function getPlayerTotalPoints(player) {
  return (player.points || []).reduce((sum, entry) => sum + Number(entry.points || 0), 0);
}

function getTopPlayers(players, limit = 11) {
  return [...players]
    .sort((a, b) => {
      const pointDelta = getPlayerTotalPoints(b) - getPlayerTotalPoints(a);
      if (pointDelta !== 0) return pointDelta;
      return String(a.name || "").localeCompare(String(b.name || ""));
    })
    .slice(0, limit);
}

function inferBonusForMatch(match, teamIplTeam) {
  const teamCode = normalizeTeamCode(teamIplTeam);
  if (!teamCode || !match) return 0;

  const status = String(match.status || "").trim();
  const team1Code = normalizeTeamCode(match.team1Code || match.team1Name);
  const team2Code = normalizeTeamCode(match.team2Code || match.team2Name);

  if (isSharedResult(status) && (teamCode === team1Code || teamCode === team2Code)) {
    return 25;
  }

  const winnerCode = detectWinningTeam(status);
  if (winnerCode && winnerCode === teamCode) {
    return 50;
  }

  return 0;
}

function getMatchLabel(match) {
  if (!match) return "";
  return (
    match.shortTitle ||
    match.title ||
    match.displayId ||
    match.id ||
    ""
  );
}

function getLatestMatchBucket(playerPoints) {
  const buckets = new Map();

  for (const entry of playerPoints || []) {
    if (!entry.matchId) continue;

    const key = String(entry.matchId);
    if (!buckets.has(key)) {
      buckets.set(key, {
        matchId: key,
        match: entry.match || null,
        points: 0,
        entries: [],
      });
    }

    const bucket = buckets.get(key);
    bucket.points += Number(entry.points || 0);
    bucket.entries.push(entry);
    if (!bucket.match && entry.match) {
      bucket.match = entry.match;
    }
  }

  return [...buckets.values()].sort((a, b) => {
    const sortDelta = getMatchSortValue(b.entries[0]) - getMatchSortValue(a.entries[0]);
    if (sortDelta !== 0) return sortDelta;
    return String(b.matchId).localeCompare(String(a.matchId));
  })[0] || null;
}

function getLatestPlayerEntry(playerPoints) {
  return [...(playerPoints || [])].sort((a, b) => {
    const sortDelta = getMatchSortValue(b) - getMatchSortValue(a);
    if (sortDelta !== 0) return sortDelta;
    return new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime();
  })[0] || null;
}

function buildCols(widths) {
  return widths.map((wch) => ({ wch }));
}

async function exportLeagueSnapshotToExcel() {
  try {
    console.log("Fetching league data...");

    const teams = await prisma.user.findMany({
      where: { name: { not: "admin" } },
      include: {
        captain: { select: { name: true } },
        viceCaptain: { select: { name: true } },
        players: {
          include: {
            points: {
              include: { match: true },
            },
          },
        },
      },
      orderBy: [
        { totalPoints: "desc" },
        { name: "asc" },
      ],
    });

    const teamRows = [];
    const playerRows = [];

    teams.forEach((team, index) => {
      const players = (team.players || []).filter((player) => String(player.role || "").toUpperCase() !== "IPL TEAM");
      const playerTotals = players
        .map((player) => ({ player, total: getPlayerTotalPoints(player) }))
        .sort((a, b) => {
          const pointDelta = b.total - a.total;
          if (pointDelta !== 0) return pointDelta;
          return String(a.player.name || "").localeCompare(String(b.player.name || ""));
        });

      const top11Total = playerTotals.slice(0, 11).reduce((sum, entry) => sum + entry.total, 0);
      const squadTotal = playerTotals.reduce((sum, entry) => sum + entry.total, 0);
      const latestBucket = getLatestMatchBucket(players.flatMap((player) => player.points || []));
      const latestMatch = latestBucket?.match || null;
      const latestBonus = inferBonusForMatch(latestMatch, team.iplTeam);

      teamRows.push({
        Rank: index + 1,
        Team: team.name,
        "IPL Team": team.iplTeam || "",
        "Leaderboard Points": Number(team.totalPoints || 0),
        "Bonus Points": Number(team.bonusPoints || 0),
        "Top 11 Player Points": top11Total,
        "All Squad Points": squadTotal,
        "Players Count": players.length,
        Captain: team.captain?.name || "",
        "Vice Captain": team.viceCaptain?.name || "",
        "Latest Match": getMatchLabel(latestMatch),
        "Latest Match Date": latestMatch?.startedAt ? latestMatch.startedAt.toISOString() : "",
        "Latest Match Player Points": latestBucket ? Number(latestBucket.points || 0) : 0,
        "Latest Match Bonus": latestBonus,
        "Latest Match Total": latestBucket ? Number(latestBucket.points || 0) + latestBonus : 0,
      });

      players
        .map((player) => {
          const totalPoints = getPlayerTotalPoints(player);
          const latestEntry = getLatestPlayerEntry(player.points || []);
          const latestMatch = latestEntry?.match || null;

          return {
            Team: team.name,
            Player: player.name,
            Role: player.role || "",
            "IPL Team": player.iplTeam || "",
            "Squad Rank": playerTotals.findIndex((entry) => entry.player.id === player.id) + 1,
            "Starter?": playerTotals.findIndex((entry) => entry.player.id === player.id) < 11 ? "Yes" : "No",
            "Player Total Points": totalPoints,
            "Matches Played": (player.points || []).length,
            "Latest Match": getMatchLabel(latestMatch),
            "Latest Match Date": latestMatch?.startedAt ? latestMatch.startedAt.toISOString() : (latestEntry?.createdAt || ""),
            "Latest Match Points": Number(latestEntry?.points || 0),
            "Latest Match Runs": Number(latestEntry?.runs || 0),
            "Latest Match Wickets": Number(latestEntry?.wickets || 0),
            "Latest Match Dot Balls": Number(latestEntry?.dotBalls || 0),
          };
        })
        .sort((a, b) => {
          const teamDelta = String(a.Team).localeCompare(String(b.Team));
          if (teamDelta !== 0) return teamDelta;
          const pointDelta = b["Player Total Points"] - a["Player Total Points"];
          if (pointDelta !== 0) return pointDelta;
          return String(a.Player).localeCompare(String(b.Player));
        })
        .forEach((row) => playerRows.push(row));
    });

    const workbook = XLSX.utils.book_new();

    const teamsSheet = XLSX.utils.json_to_sheet(teamRows);
    teamsSheet["!cols"] = buildCols([8, 28, 12, 18, 12, 18, 16, 14, 22, 22, 22, 18, 22, 18, 18]);
    XLSX.utils.book_append_sheet(workbook, teamsSheet, "Teams Summary");

    const playersSheet = XLSX.utils.json_to_sheet(playerRows);
    playersSheet["!cols"] = buildCols([24, 24, 14, 12, 12, 10, 18, 14, 24, 22, 16, 14, 16, 18]);
    XLSX.utils.book_append_sheet(workbook, playersSheet, "Players Snapshot");

    const notesSheet = XLSX.utils.aoa_to_sheet([
      ["Fantasy IPL export snapshot"],
      ["Generated at", new Date().toISOString()],
      ["Leaderboard formula", "Top 11 player totals + team bonus points"],
      ["Team bonus", "Partner win = 50, abandoned/no-result split = 25"],
      ["Player snapshot", "Latest match row shows the most recent scoring entry for each player"],
    ]);
    notesSheet["!cols"] = buildCols([20, 80]);
    XLSX.utils.book_append_sheet(workbook, notesSheet, "Notes");

    const timestamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+$/, "Z");
    const filename = `league_snapshot_${timestamp}.xlsx`;
    const filepath = path.join(__dirname, "..", filename);

    XLSX.writeFile(workbook, filepath);
    console.log(`Excel file created: ${filepath}`);
  } catch (error) {
    console.error("Error exporting league snapshot:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

exportLeagueSnapshotToExcel();
