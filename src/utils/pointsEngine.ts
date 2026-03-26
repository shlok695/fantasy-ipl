import { calculateDream11Points } from "./pointsEngineCore";

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

export { calculateDream11Points };

