"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, Users } from "lucide-react";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";
import { getTeamById } from "@/lib/leagueData";
import { getPlayerImage } from "@/lib/playerIndex";
import { getPlayerTotalPoints, sortPlayersByPoints } from "@/lib/teamMetrics";

export function TeamDetailClientPage({ teamId }: { teamId: string }) {
  const { loading, derived } = useLeagueData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  const team = getTeamById(derived.teams, teamId);
  if (!team) {
    notFound();
  }

  const summary = derived.teamSummaries.find((entry) => entry.team.id === teamId);
  const players = sortPlayersByPoints(team.players || []);

  return (
    <div className="space-y-8">
      <LeaguePageHeader
        eyebrow="Team Detail"
        title={team.name}
        description={`${team.name} currently sit ${summary ? `#${summary.rank}` : "in the league"} with ${Math.round(
          team.totalPoints || 0
        )} points. Explore their full squad, top fantasy scorers, and season badges.`}
        primaryHref="/teams"
        primaryLabel="Back to Teams"
        secondaryHref="/leaderboard"
        secondaryLabel="Open Rankings"
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="glass-panel rounded-[30px] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-cyan-200">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Full Squad</p>
              <h2 className="font-display text-2xl font-black uppercase text-white">All Players</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white">
                  {index + 1}
                </div>
                <Image
                  src={getPlayerImage(player.name, player.role || undefined)}
                  alt={player.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl border border-white/15 bg-slate-950 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{player.name}</p>
                  <p className="truncate text-xs text-slate-400">{player.role || "Player"} • {player.iplTeam || "Unassigned IPL side"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Points</p>
                  <p className="text-lg font-black text-cyan-200">{Math.round(getPlayerTotalPoints(player))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="glass-panel rounded-[30px] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-3 text-[#F5C451]">
                <Crown size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Badges</p>
                <h2 className="font-display text-2xl font-black uppercase text-white">Collection</h2>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(derived.teamBadges[teamId] || []).map((badge) => (
                <span key={badge.label} className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${badge.tone}`}>
                  {badge.label}
                </span>
              ))}
              {(derived.teamBadges[teamId] || []).length === 0 ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300">
                  Chasing Form
                </span>
              ) : null}
            </div>
          </section>

          <section className="glass-panel rounded-[30px] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Quick Facts</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">League Rank</p>
                <p className="mt-1 text-3xl font-black text-white">#{summary?.rank || "-"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Points</p>
                <p className="mt-1 text-3xl font-black text-cyan-200">{Math.round(team.totalPoints || 0)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Budget Left</p>
                <p className="mt-1 text-3xl font-black text-violet-200">{team.budget.toFixed(1)} Cr</p>
              </div>
            </div>
            <Link
              href="/players"
              className="mt-5 inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white transition-colors duration-300 hover:border-cyan-300/30 hover:bg-cyan-400/10"
            >
              Compare Players League-Wide
            </Link>
          </section>
        </aside>
      </section>
    </div>
  );
}
