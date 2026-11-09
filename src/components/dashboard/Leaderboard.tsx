import Link from "next/link";
import { AlertTriangle, Trophy } from "lucide-react";
import { TeamCard } from "@/components/dashboard/TeamCard";
import type { DashboardTeam, TeamSummary } from "@/components/dashboard/types";
import type { SyncAlert } from "@/components/league/useLeagueData";

interface LeaderboardProps {
  teams: TeamSummary[];
  currentUserId?: string;
  isAdmin: boolean;
  onDeleteTeam: (team: DashboardTeam) => Promise<void>;
  onDropPlayer: (team: DashboardTeam, player: TeamSummary["topPlayers"][number]) => Promise<void>;
  onUpdateBudget: (teamId: string, nextBudget: number) => Promise<void>;
  syncAlerts?: SyncAlert[];
}

export function Leaderboard({
  teams,
  currentUserId,
  isAdmin,
  onDeleteTeam,
  onDropPlayer,
  onUpdateBudget,
  syncAlerts = [],
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

      {isAdmin && syncAlerts.length > 0 ? (
        <div className="animate-pulse rounded-[24px] border border-amber-300/40 bg-amber-400/12 p-4 shadow-[0_0_32px_rgba(251,191,36,0.18)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-amber-300/35 bg-amber-300/15 p-2 text-amber-200">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200">Admin Sync Alert</p>
                <h3 className="mt-1 text-lg font-black text-white">Unfinished match still needs review</h3>
                <p className="mt-1 text-sm leading-6 text-amber-50/80">
                  These matches stayed unfinished after at least 2 API hit cycles. Check the scorecard/status and adjust points if needed.
                </p>
              </div>
            </div>
            <Link
              href="/admin/points"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-amber-200/35 bg-amber-300/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-50 transition-colors hover:bg-amber-300/25"
            >
              Fix Points
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {syncAlerts.map((alert) => (
              <div key={alert.syncKey} className="rounded-2xl border border-amber-200/20 bg-slate-950/45 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {alert.shortTitle || alert.displayId || alert.matchId || "Unknown match"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-50/75">{alert.status || "Status unavailable"}</p>
                    {(alert.apiId || alert.matchId) && (
                      <p className="mt-1 font-mono text-[11px] leading-5 text-amber-100/70">
                        API ID: {alert.apiId || alert.matchId}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
                    {alert.attempts} attempts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
