const crypto = require("crypto");

const DREAM11_SCORE_VERSION = "dream11-v3";

function sanitizePlayerMatchStats(stats) {
  return {
    runs: Number(stats?.runs || 0),
    ballsFaced: Number(stats?.ballsFaced || 0),
    fours: Number(stats?.fours || 0),
    sixes: Number(stats?.sixes || 0),
    wickets: Number(stats?.wickets || 0),
    oversBowled: Number(stats?.oversBowled || 0),
    runsConceded: Number(stats?.runsConceded || 0),
    maidens: Number(stats?.maidens || 0),
    catches: Number(stats?.catches || 0),
    stumpings: Number(stats?.stumpings || 0),
    runOutsDirect: Number(stats?.runOutsDirect || 0),
    runOutsIndirect: Number(stats?.runOutsIndirect || 0),
    lbwBowled: Number(stats?.lbwBowled || 0),
    dotBalls: Number(stats?.dotBalls || 0),
    isCaptain: Boolean(stats?.isCaptain),
    isViceCaptain: Boolean(stats?.isViceCaptain),
    inStartingXI: stats?.inStartingXI !== false,
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function getMultiplierContext(stats) {
  if (stats.isCaptain) {
    return { multiplierLabel: "Captain", multiplierValue: 2 };
  }

  if (stats.isViceCaptain) {
    return { multiplierLabel: "Vice Captain", multiplierValue: 1.5 };
  }

  return { multiplierLabel: "Normal", multiplierValue: 1 };
}

function calculateDream11Breakdown(rawStats) {
  const stats = sanitizePlayerMatchStats(rawStats);
  const lines = [];
  let subtotal = 0;

  const add = (label, value) => {
    if (!value) return;
    subtotal += value;
    lines.push({ label, value });
  };

  add(`Runs (${stats.runs} x 1)`, stats.runs);
  add(`Fours (${stats.fours} x 1)`, stats.fours);
  add(`Sixes (${stats.sixes} x 2)`, stats.sixes * 2);

  if (stats.runs >= 100) add("100 run bonus", 16);
  else if (stats.runs >= 50) add("50 run bonus", 8);
  else if (stats.runs >= 30) add("30 run bonus", 4);

  if (stats.runs === 0 && stats.ballsFaced > 0) add("Duck penalty", -2);

  if (stats.ballsFaced >= 10) {
    const sr = (stats.runs / stats.ballsFaced) * 100;
    if (sr > 170) add(`Strike rate bonus (${sr.toFixed(2)})`, 6);
    else if (sr > 150) add(`Strike rate bonus (${sr.toFixed(2)})`, 4);
    else if (sr >= 130) add(`Strike rate bonus (${sr.toFixed(2)})`, 2);
    else if (sr >= 60 && sr <= 70) add(`Strike rate penalty (${sr.toFixed(2)})`, -2);
    else if (sr >= 50 && sr <= 59.99) add(`Strike rate penalty (${sr.toFixed(2)})`, -4);
    else if (sr < 50) add(`Strike rate penalty (${sr.toFixed(2)})`, -6);
  }

  add(`Wickets (${stats.wickets} x 25)`, stats.wickets * 25);
  add(`LBW/Bowled wickets (${stats.lbwBowled} x 8)`, stats.lbwBowled * 8);

  if (stats.wickets >= 5) add("5 wicket bonus", 16);
  else if (stats.wickets >= 4) add("4 wicket bonus", 12);
  else if (stats.wickets >= 3) add("3 wicket bonus", 4);

  add(`Maidens (${stats.maidens} x 12)`, stats.maidens * 12);

  if (stats.oversBowled >= 2) {
    const eco = stats.runsConceded / stats.oversBowled;
    if (eco < 5) add(`Economy bonus (${eco.toFixed(2)})`, 6);
    else if (eco >= 5 && eco < 6) add(`Economy bonus (${eco.toFixed(2)})`, 4);
    else if (eco >= 6 && eco <= 7) add(`Economy bonus (${eco.toFixed(2)})`, 2);
    else if (eco >= 10 && eco <= 11) add(`Economy penalty (${eco.toFixed(2)})`, -2);
    else if (eco > 11 && eco <= 12) add(`Economy penalty (${eco.toFixed(2)})`, -4);
    else if (eco > 12) add(`Economy penalty (${eco.toFixed(2)})`, -6);
  }

  add(`Catches (${stats.catches} x 8)`, stats.catches * 8);
  if (stats.catches >= 3) add("3 catch bonus", 4);
  add(`Stumpings (${stats.stumpings} x 12)`, stats.stumpings * 12);
  add(`Direct run outs (${stats.runOutsDirect} x 12)`, stats.runOutsDirect * 12);
  add(`Indirect run outs (${stats.runOutsIndirect} x 6)`, stats.runOutsIndirect * 6);
  add("Playing XI", stats.inStartingXI ? 4 : 0);

  const { multiplierLabel, multiplierValue } = getMultiplierContext(stats);
  const finalPoints = Math.round(subtotal * multiplierValue);

  return {
    stats,
    lines,
    subtotal,
    multiplierLabel,
    multiplierValue,
    finalPoints,
  };
}

function createPlayerPointsAudit(rawStats) {
  const breakdown = calculateDream11Breakdown(rawStats);
  const calculationHash = crypto
    .createHash("sha1")
    .update(
      stableStringify({
        scoreVersion: DREAM11_SCORE_VERSION,
        stats: breakdown.stats,
        subtotal: breakdown.subtotal,
        multiplierLabel: breakdown.multiplierLabel,
        multiplierValue: breakdown.multiplierValue,
        finalPoints: breakdown.finalPoints,
      })
    )
    .digest("hex");

  return {
    scoreVersion: DREAM11_SCORE_VERSION,
    calculationHash,
    stats: breakdown.stats,
    breakdown: {
      lines: breakdown.lines,
      subtotal: breakdown.subtotal,
      multiplierLabel: breakdown.multiplierLabel,
      multiplierValue: breakdown.multiplierValue,
      finalPoints: breakdown.finalPoints,
    },
    finalPoints: breakdown.finalPoints,
  };
}

function calculateDream11Points(stats) {
  return calculateDream11Breakdown(stats).finalPoints;
}

module.exports = {
  DREAM11_SCORE_VERSION,
  calculateDream11Breakdown,
  calculateDream11Points,
  createPlayerPointsAudit,
  sanitizePlayerMatchStats,
};
