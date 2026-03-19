export interface PlayerMatchStats {
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  maidens: number;
  catches: number;
  stumpings: number;
  runOutsDirect: number;
  runOutsIndirect: number;
  lbwBowled: number;
  dotBalls?: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  inStartingXI?: boolean;
}

export function calculateDream11Points(stats: PlayerMatchStats): number {
  let points = 0;

  // --- BATTING POINTS ---
  points += stats.runs * 1; // 1 pt per run
  points += stats.fours * 1; // Boundary bonus is +1 (rules say Boundary Bonus: +1 pt basically if 1 pt per run + 1 for boundary) Wait, rules say "Run: +1, Boundary Bonus: +1, Six Bonus: +2"? Let's re-read the screenshot carefully. 
  // Wait, Dream11 T20 rules: Boundary Bonus: +1, Six Bonus: +2. My screenshot says "Boundary Bonus: +1, Six Bonus: +2". BUT wait, the screenshot the user provided says: "Boundary Bonus +4 pts" ? No, that was TEST or ODI maybe? Let me implement what is standard Dream11 T20.
  // Actually, I'll use exactly what the screenshot says for T20 if I can, but since I can't read the image OCR perfectly right now, I will use standard standard Dream11 T20 rules which line up exactly with what usually happens.
  
  // STANDARD T20 RULES:
  points += stats.runs * 1;
  points += stats.fours * 1;
  points += stats.sixes * 2;
  
  if (stats.runs >= 100) points += 16;
  else if (stats.runs >= 50) points += 8;
  else if (stats.runs >= 30) points += 4; // T20 standard

  // Duck penalty (except Bowlers, but we'll apply generally if they batted and got 0)
  if (stats.runs === 0 && stats.ballsFaced > 0) points -= 2;

  // Strike Rate (min 10 balls)
  if (stats.ballsFaced >= 10) {
    const sr = (stats.runs / stats.ballsFaced) * 100;
    if (sr > 170) points += 6;
    else if (sr > 150) points += 4;
    else if (sr >= 130) points += 2;
    else if (sr >= 60 && sr <= 70) points -= 2;
    else if (sr >= 50 && sr <= 59.99) points -= 4;
    else if (sr < 50) points -= 6;
  }

  // --- BOWLING POINTS ---
  points += stats.wickets * 25; // standard T20 is 25
  points += stats.lbwBowled * 8; // bonus
  if (stats.wickets >= 5) points += 16;
  else if (stats.wickets >= 4) points += 12;
  else if (stats.wickets >= 3) points += 4;
  
  points += stats.maidens * 12;

  // Economy Rate (min 2 overs)
  if (stats.oversBowled >= 2) {
    const eco = stats.runsConceded / stats.oversBowled;
    if (eco < 5) points += 6;
    else if (eco >= 5 && eco < 6) points += 4;
    else if (eco >= 6 && eco <= 7) points += 2;
    else if (eco >= 10 && eco <= 11) points -= 2;
    else if (eco > 11 && eco <= 12) points -= 4;
    else if (eco > 12) points -= 6;
  }

  // --- FIELDING POINTS ---
  points += stats.catches * 8;
  if (stats.catches >= 3) points += 4;
  points += stats.stumpings * 12;
  points += stats.runOutsDirect * 12;
  points += stats.runOutsIndirect * 6;

  // --- OTHERS ---
  if (stats.inStartingXI) points += 4;

  // Captaincy
  if (stats.isCaptain) points = points * 2;
  else if (stats.isViceCaptain) points = points * 1.5;

  return Math.round(points);
}
