"use client";

import Link from "next/link";
import { Shield, Users } from "lucide-react";
import { TeamCard } from "@/components/dashboard/TeamCard";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";

export default function TeamsPage() {
  const { loading, currentUserId, derived } = useLeagueData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <LeaguePageHeader
        eyebrow="Teams"
        title="Fantasy Franchises"
        description="Browse every fantasy team, scan their current form, and open dedicated team detail views for full squad context and season badges."
        primaryHref="/leaderboard"
        primaryLabel="Open Rankings"
        secondaryHref="/players"
        secondaryLabel="Player Stats"
      />

      <section className="grid gap-5 xl:grid-cols-2">
        {derived.teamSummaries.map((summary) => (
          <div key={summary.team.id} className="space-y-4">
            <TeamCard
              summary={summary}
              isAdmin={false}
              isCurrentUserTeam={summary.team.id === currentUserId}
              onDeleteTeam={async () => {}}
              onDropPlayer={async () => {}}
              onUpdateBudget={async () => {}}
            />
            <div className="glass-panel rounded-[24px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Team Detail View</p>
                  <p className="mt-1 text-sm text-slate-300">Open squad breakdown, badge collection, and top contributors.</p>
                </div>
                <Link
                  href={`/teams/${summary.team.id}`}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
                >
                  Open Team
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(derived.teamBadges[summary.team.id] || []).map((badge) => (
                  <span key={badge.label} className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${badge.tone}`}>
                    {badge.label}
                  </span>
                ))}
                {(derived.teamBadges[summary.team.id] || []).length === 0 ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300">
                    Building Momentum
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-cyan-200">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Squad Depth</p>
              <h2 className="font-display text-2xl font-black uppercase text-white">Deepest Rosters</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {derived.teamSummaries
              .slice()
              .sort((a, b) => b.playerCount - a.playerCount)
              .slice(0, 4)
              .map((summary) => (
                <div key={summary.team.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="font-bold text-white">{summary.team.name}</p>
                  <p className="text-sm font-black text-cyan-200">{summary.playerCount} players</p>
                </div>
              ))}
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-violet-400/25 bg-violet-400/10 p-3 text-violet-200">
              <Shield size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Budget Watch</p>
              <h2 className="font-display text-2xl font-black uppercase text-white">Financial Flex</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {derived.teamSummaries
              .slice()
              .sort((a, b) => b.budget - a.budget)
              .slice(0, 4)
              .map((summary) => (
                <div key={summary.team.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="font-bold text-white">{summary.team.name}</p>
                  <p className="text-sm font-black text-violet-200">{summary.budget.toFixed(1)} Cr</p>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
