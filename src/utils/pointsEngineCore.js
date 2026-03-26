function calculateDream11Points(stats) {
  let points = 0;

  points += stats.runs * 1;
  points += stats.fours * 1;
  points += stats.runs * 1;
  points += stats.fours * 1;
  points += stats.sixes * 2;

  if (stats.runs >= 100) points += 16;
  else if (stats.runs >= 50) points += 8;
  else if (stats.runs >= 30) points += 4;

  if (stats.runs === 0 && stats.ballsFaced > 0) points -= 2;

  if (stats.ballsFaced >= 10) {
    const sr = (stats.runs / stats.ballsFaced) * 100;
    if (sr > 170) points += 6;
    else if (sr > 150) points += 4;
    else if (sr >= 130) points += 2;
    else if (sr >= 60 && sr <= 70) points -= 2;
    else if (sr >= 50 && sr <= 59.99) points -= 4;
    else if (sr < 50) points -= 6;
  }

  points += stats.wickets * 25;
  points += stats.lbwBowled * 8;
  if (stats.wickets >= 5) points += 16;
  else if (stats.wickets >= 4) points += 12;
  else if (stats.wickets >= 3) points += 4;

  points += stats.maidens * 12;

  if (stats.oversBowled >= 2) {
    const eco = stats.runsConceded / stats.oversBowled;
    if (eco < 5) points += 6;
    else if (eco >= 5 && eco < 6) points += 4;
    else if (eco >= 6 && eco <= 7) points += 2;
    else if (eco >= 10 && eco <= 11) points -= 2;
    else if (eco > 11 && eco <= 12) points -= 4;
    else if (eco > 12) points -= 6;
  }

  points += stats.catches * 8;
  if (stats.catches >= 3) points += 4;
  points += stats.stumpings * 12;
  points += stats.runOutsDirect * 12;
  points += stats.runOutsIndirect * 6;

  if (stats.inStartingXI) points += 4;

  if (stats.isCaptain) points *= 2;
  else if (stats.isViceCaptain) points *= 1.5;

  return Math.round(points);
}

module.exports = {
  calculateDream11Points,
};

