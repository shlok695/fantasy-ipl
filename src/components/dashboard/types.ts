import type { LucideIcon } from "lucide-react";

export interface PlayerPointEntry {
  id?: string;
  matchId?: string | null;
  points?: number;
  runs?: number;
  ballsFaced?: number;
  wickets?: number;
  dotBalls?: number;
  breakdownJson?: string | null;
  statsJson?: string | null;
  scoreVersion?: string | null;
  calculationHash?: string | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
  match?: {
    id?: string;
    displayId?: string | null;
    shortTitle?: string | null;
    title?: string | null;
    season?: string | null;
    status?: string | null;
    team1Code?: string | null;
    team2Code?: string | null;
    team1Name?: string | null;
    team2Name?: string | null;
    startedAt?: string | null;
  } | null;
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
  captainId?: string | null;
  viceCaptainId?: string | null;
  captain?: {
    id: string;
    name: string;
  } | null;
  viceCaptain?: {
    id: string;
    name: string;
  } | null;
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
  latestMatchLabel?: string | null;
  previousMatchLabel?: string | null;
  previousTrend?: number;
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
