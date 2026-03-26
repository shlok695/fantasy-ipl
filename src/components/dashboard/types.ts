import type { LucideIcon } from "lucide-react";

export interface PlayerPointEntry {
  id?: string;
  matchId?: string | null;
  points?: number;
  runs?: number;
  ballsFaced?: number;
  wickets?: number;
  dotBalls?: number;
  createdAt?: string;
}

export interface DashboardPlayer {
  id: string;
  name: string;
  role?: string | null;
  iplTeam?: string | null;
  auctionPrice?: number | null;
  user?: {
    name?: string | null;
  } | null;
  points?: PlayerPointEntry[];
}

export interface DashboardTeam {
  id: string;
  name: string;
  budget: number;
  totalPoints: number;
  bonusPoints?: number;
  iplTeam?: string | null;
  players?: DashboardPlayer[];
}

export interface TeamSummary {
  team: DashboardTeam;
  rank: number;
  previousRank?: number;
  movement?: number;
  points: number;
  playerCount: number;
  budget: number;
  topPlayers: DashboardPlayer[];
  recentTrend: number;
}

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: string;
}

export interface SpotlightItem {
  label: string;
  statLabel: string;
  statValue: string;
  accentClass: string;
  player: DashboardPlayer & {
    totalPoints: number;
    totalRuns: number;
    totalWickets: number;
    totalDotBalls: number;
    sr: number;
  };
}
