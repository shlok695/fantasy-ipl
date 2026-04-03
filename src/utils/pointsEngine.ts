import {
  DREAM11_SCORE_VERSION,
  calculateDream11Breakdown,
  calculateDream11Points,
  createPlayerPointsAudit,
} from "./pointsEngineCore";

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

export {
  DREAM11_SCORE_VERSION,
  calculateDream11Breakdown,
  calculateDream11Points,
  createPlayerPointsAudit,
};
