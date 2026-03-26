"use client";

import Link from "next/link";
import Image from "next/image";
import { Activity, ArrowRight, Trophy } from "lucide-react";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TeamCard } from "@/components/dashboard/TeamCard";
import { SpotlightCard } from "@/components/dashboard/SpotlightCard";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";
import { getPlayerImage } from "@/lib/playerIndex";

export default function Dashboard() {
  const { loading, currentUserId, derived } = useLeagueData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8 pb-2 sm:space-y-10">
      <HeroSection topTeams={derived.topTeams} />

      <section className="dashboard-fade-in grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {derived.stats.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </section>

      {derived.topTeams.length > 0 ? (
        <section className="dashboard-fade-in space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Podium Finishers</p>
            <h2 className="font-display text-3xl font-black uppercase text-white sm:text-4xl">Top 3 Teams</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3 lg:items-end">
            {derived.topTeams.map((summary) => (
              <div key={summary.team.id} className={summary.rank === 1 ? "lg:order-2" : summary.rank === 2 ? "lg:order-1" : "lg:order-3"}>
                <TeamCard
                  summary={summary}
                  isAdmin={false}
                  isCurrentUserTeam={summary.team.id === currentUserId}
                  onDeleteTeam={async () => {}}
                  onDropPlayer={async () => {}}
                  onUpdateBudget={async () => {}}
                  variant="podium"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <section id="leaderboard" className="dashboard-fade-in space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Leaderboard Preview</p>
              <h2 className="font-display text-3xl font-black uppercase text-white sm:text-4xl">League Snapshot</h2>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/10"
            >
              Open Leaderboard
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid gap-5">
            {derived.leaderboardPreview.map((summary) => (
              <TeamCard
                key={summary.team.id}
                summary={summary}
                isAdmin={false}
                isCurrentUserTeam={summary.team.id === currentUserId}
                onDeleteTeam={async () => {}}
                onDropPlayer={async () => {}}
                onUpdateBudget={async () => {}}
              />
            ))}
          </div>
        </section>

        <aside className="dashboard-fade-in self-start space-y-5">
          <section className="glass-panel relative overflow-hidden rounded-[30px] p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-400/10" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Season Story</p>
                  <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Title Race Pulse</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-cyan-200">
                  <Trophy size={18} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{derived.seasonStoryShort}</p>
              <Link
                href="/season"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white transition-colors duration-300 hover:border-cyan-300/30 hover:bg-cyan-400/10"
              >
                Go to Season
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="glass-panel overflow-hidden rounded-[30px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Season Leaders</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Quick Leaders</h2>
              </div>
              <Link
                href="/season"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-200 transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/10"
              >
                View More
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {derived.seasonLeadersPreview.map((leader) =>
                leader.player ? <SpotlightCard key={leader.label} {...leader} player={leader.player} /> : null
              )}
            </div>
          </section>

          <section className="glass-panel overflow-hidden rounded-[30px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Recent Activity</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Latest Match Updates</h2>
              </div>
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-cyan-200">
                <Activity size={18} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {derived.recentActivityPreview.length > 0 ? (
                derived.recentActivityPreview.map((entry, index) => (
                  <div key={`${entry.playerName}-${entry.matchId}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{entry.playerName}</p>
                        <p className="truncate text-xs text-slate-400">
                          {entry.teamName || "Fantasy Squad"} • {entry.matchLabel}
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-200">
                        +{Math.round(entry.points)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[26px] border border-dashed border-white/10 bg-slate-950/35 p-5 text-sm text-slate-400">
                  Match updates will appear here after points are synced.
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel overflow-hidden rounded-[30px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Fantasy MVP</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Top Performer</h2>
              </div>
              <div className="rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-3 text-[#F5C451]">
                <Trophy size={18} />
              </div>
            </div>

            {derived.topPlayer ? (
              <div className="mt-5 rounded-[26px] border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center gap-4">
                  <Image
                    src={getPlayerImage(derived.topPlayer.name, derived.topPlayer.role || undefined)}
                    alt={derived.topPlayer.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-2xl border border-white/15 bg-slate-950 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-white">{derived.topPlayer.name}</p>
                    <p className="truncate text-sm text-slate-300">
                      {derived.topPlayer.iplTeam || derived.topPlayer.user?.name || derived.topPlayer.role || "League MVP"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Points</p>
                    <p className="mt-1 text-2xl font-black text-white">{Math.round(derived.topPlayer.totalPoints)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Impact</p>
                    <p className="mt-1 text-2xl font-black text-cyan-200">{derived.topPlayer.totalRuns + derived.topPlayer.totalWickets}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[26px] border border-dashed border-white/10 bg-slate-950/35 p-5 text-sm text-slate-400">
                Waiting for synced player points to surface the MVP board.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
