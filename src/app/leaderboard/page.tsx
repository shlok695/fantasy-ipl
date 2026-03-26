"use client";

import { ArrowUpRight, Minus, TrendingDown, Trophy } from "lucide-react";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";
import { getMovementLabel } from "@/lib/leagueData";

export default function LeaderboardPage() {
  const { loading, currentUserId, derived } = useLeagueData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <LeaguePageHeader
        eyebrow="Leaderboard"
        title="Full League Rankings"
        description="See the entire points table, track rank swings after the latest scoring update, and compare the teams shaping the title race."
        primaryHref="/teams"
        primaryLabel="Browse Teams"
        secondaryHref="/season"
        secondaryLabel="Season View"
      />

      <Leaderboard
        teams={derived.teamSummaries}
        currentUserId={currentUserId}
        isAdmin={false}
        onDeleteTeam={async () => {}}
        onDropPlayer={async () => {}}
        onUpdateBudget={async () => {}}
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Rank Movement</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Latest Swing</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-cyan-200">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {derived.teamSummaries.map((summary) => (
              <div key={summary.team.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <div>
                  <p className="font-bold text-white">{summary.team.name}</p>
                  <p className="text-xs text-slate-400">
                    Rank #{summary.rank} now, previously #{summary.previousRank || summary.rank}
                  </p>
                </div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
                    (summary.movement || 0) > 0
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : (summary.movement || 0) < 0
                        ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {(summary.movement || 0) > 0 ? <ArrowUpRight size={12} /> : (summary.movement || 0) < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {getMovementLabel(summary.movement || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Team Comparisons</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Race Within The Race</h2>
            </div>
            <div className="rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-3 text-[#F5C451]">
              <Trophy size={18} />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {derived.teamComparisons.map((comparison) => (
              <article key={comparison.title} className="rounded-[24px] border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">{comparison.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{comparison.summary}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{comparison.left.team.name}</p>
                    <p className="mt-1 text-2xl font-black text-white">{Math.round(comparison.left.points)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{comparison.right.team.name}</p>
                    <p className="mt-1 text-2xl font-black text-white">{Math.round(comparison.right.points)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
