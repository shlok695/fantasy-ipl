"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Crown,
  Minus,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { SpotlightCard } from "@/components/dashboard/SpotlightCard";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";
import { getMovementLabel } from "@/lib/leagueData";

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
        secondaryLabel="Sortable Stats"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SeasonStatCard
          icon={Trophy}
          label="Leader"
          value={derived.topTeams[0]?.team.name || "Waiting"}
          detail={derived.topTeams[0] ? `${Math.round(derived.topTeams[0].points)} pts` : "No teams yet"}
          tone="text-[#F5C451]"
        />
        <SeasonStatCard
          icon={Activity}
          label="Latest Match"
          value={derived.latestMatchId ? `Match ${derived.latestMatchId}` : "No scores"}
          detail={derived.recentActivityPreview[0]?.matchLabel || "Sync points to start the race"}
          tone="text-cyan-200"
        />
        <SeasonStatCard
          icon={Crown}
          label="Top Scorer"
          value={derived.topPlayer?.name || "Waiting"}
          detail={derived.topPlayer ? `${Math.round(derived.topPlayer.totalPoints)} fantasy pts` : "No player points yet"}
          tone="text-emerald-200"
        />
        <SeasonStatCard
          icon={Users}
          label="Active Teams"
          value={`${derived.teamSummaries.length}`}
          detail={`${derived.allPlayers.length} drafted players`}
          tone="text-violet-200"
        />
      </section>

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
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <RaceMiniTile name={comparison.left.team.name} value={`${Math.round(comparison.left.points)} pts`} />
                  <RaceMiniTile name={comparison.right.team.name} value={`${Math.round(comparison.right.points)} pts`} />
                </div>
              </article>
            ))}
            {derived.teamComparisons.length === 0 ? (
              <article className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Race Loading</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">The title race panel will sharpen once at least two teams have points.</p>
              </article>
            ) : null}
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
            {derived.milestones.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4 text-sm leading-7 text-slate-300">
                Milestones will appear as teams and players cross meaningful season marks.
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      <section className="glass-panel rounded-[30px] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Title Table</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Race Snapshot</h2>
          </div>
          <Link href="/teams/compare" className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/10">
            Compare Teams
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {derived.teamSummaries.slice(0, 6).map((summary) => (
            <article key={summary.team.id} className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-4 md:grid-cols-[64px_minmax(0,1fr)_120px_130px_120px] md:items-center">
              <div className="text-2xl font-black text-white">#{summary.rank}</div>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">{summary.team.name}</p>
                <p className="text-xs text-slate-400">{summary.playerCount} players - {summary.budget.toFixed(1)} Cr left</p>
              </div>
              <p className="text-sm font-black text-cyan-200">{Math.round(summary.points)} pts</p>
              <p className="text-sm font-black text-emerald-200">+{Math.round(summary.recentTrend)} latest</p>
              <MovementPill movement={summary.movement || 0} />
            </article>
          ))}
        </div>
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
                    <p className="text-xs text-slate-400">{award.teamName || "Fantasy Squad"} - {award.matchLabel}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-200">{award.value}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{award.description}</p>
              </article>
            ))}
            {derived.weeklyAwards.length === 0 ? (
              <article className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">No Weekly Awards Yet</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">Once completed match data is synced, weekly MVP, run machine, and strike bowler awards will show here.</p>
              </article>
            ) : null}
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
                    <p className="text-xs text-slate-400">Rank #{summary.rank} - {Math.round(summary.points)} pts</p>
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
                  {(derived.teamBadges[summary.team.id] || []).length === 0 ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300">
                      Building Form
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SeasonStatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className="glass-panel rounded-[26px] p-5">
      <div className={`mb-4 inline-flex rounded-2xl border border-white/10 bg-white/8 p-3 ${tone}`}>
        <Icon size={18} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-xl font-black text-white">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-400">{detail}</p>
    </article>
  );
}

function RaceMiniTile({ name, value }: { name: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{name}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MovementPill({ movement }: { movement: number }) {
  return (
    <div
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
        movement > 0
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : movement < 0
            ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
            : "border-white/10 bg-white/5 text-slate-300"
      }`}
    >
      {movement > 0 ? <ArrowUpRight size={12} /> : <Minus size={12} />}
      {getMovementLabel(movement)}
    </div>
  );
}
