import { Trophy } from "lucide-react";
import { TeamCard } from "@/components/dashboard/TeamCard";
import type { DashboardTeam, TeamSummary } from "@/components/dashboard/types";

interface LeaderboardProps {
  teams: TeamSummary[];
  currentUserId?: string;
  isAdmin: boolean;
  onDeleteTeam: (team: DashboardTeam) => Promise<void>;
  onDropPlayer: (team: DashboardTeam, player: TeamSummary["topPlayers"][number]) => Promise<void>;
  onUpdateBudget: (teamId: string, nextBudget: number) => Promise<void>;
}

export function Leaderboard({
  teams,
  currentUserId,
  isAdmin,
  onDeleteTeam,
  onDropPlayer,
  onUpdateBudget,
}: LeaderboardProps) {
  return (
    <section id="leaderboard" className="dashboard-fade-in space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Leaderboard</p>
          <h2 className="font-display text-3xl font-black uppercase text-white sm:text-4xl">League Rankings</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">
          <Trophy size={14} className="text-[#F5C451]" />
          Updated live every 5 seconds
        </div>
      </div>

      <div className="grid gap-5">
        {teams.map((summary) => (
          <TeamCard
            key={summary.team.id}
            summary={summary}
            isAdmin={isAdmin}
            isCurrentUserTeam={summary.team.id === currentUserId}
            onDeleteTeam={onDeleteTeam}
            onDropPlayer={onDropPlayer}
            onUpdateBudget={onUpdateBudget}
          />
        ))}
      </div>
    </section>
  );
}
