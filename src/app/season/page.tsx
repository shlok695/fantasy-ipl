"use client";

import Link from "next/link";
import { Sparkles, Trophy } from "lucide-react";
import { SpotlightCard } from "@/components/dashboard/SpotlightCard";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";

export default function SeasonPage() {
  const { loading, derived } = useLeagueData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <LeaguePageHeader
        eyebrow="Season"
        title="Season Story & Awards"
        description="Follow the title race, full season leaders, weekly awards, milestones, badge collections, and the narrative behind the Fantasy IPL campaign."
        primaryHref="/leaderboard"
        primaryLabel="Title Race"
        secondaryHref="/players"
        secondaryLabel="Player Stats"
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="glass-panel rounded-[30px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Season Narrative</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">League Pulse</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">{derived.seasonStory}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {derived.teamComparisons.map((comparison) => (
              <article key={comparison.title} className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">{comparison.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{comparison.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="glass-panel rounded-[30px] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-3 text-[#F5C451]">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Milestones</p>
              <h2 className="font-display text-2xl font-black uppercase text-white">Season Marks</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {derived.milestones.map((milestone) => (
              <div key={milestone.title} className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                <div className={`rounded-2xl bg-gradient-to-r ${milestone.accent} px-3 py-2`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white">{milestone.title}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{milestone.description}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Season Leaders</p>
            <h2 className="font-display text-3xl font-black uppercase text-white">Full Leaderboard Of Stars</h2>
          </div>
          <Link href="/players" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/10">
            Open Players
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {derived.playerLeaders.map((leader) => (leader.player ? <SpotlightCard key={leader.label} {...leader} player={leader.player} /> : null))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="glass-panel rounded-[30px] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-cyan-200">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Weekly Awards</p>
              <h2 className="font-display text-2xl font-black uppercase text-white">Latest Winners</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {derived.weeklyAwards.map((award, index) => (
              <article key={`${award.matchId}-${award.title}-${index}`} className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">{award.title}</p>
                    <p className="mt-1 text-lg font-black text-white">{award.winner}</p>
                    <p className="text-xs text-slate-400">{award.teamName || "Fantasy Squad"} • {award.matchLabel}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-200">{award.value}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{award.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[30px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Badge Collections</p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Team Honors</h2>
          <div className="mt-5 space-y-3">
            {derived.teamSummaries.map((summary) => (
              <article key={summary.team.id} className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-white">{summary.team.name}</p>
                    <p className="text-xs text-slate-400">Rank #{summary.rank} • {Math.round(summary.points)} pts</p>
                  </div>
                  <Link href={`/teams/${summary.team.id}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-200">
                    Open
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(derived.teamBadges[summary.team.id] || []).map((badge) => (
                    <span key={badge.label} className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${badge.tone}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
