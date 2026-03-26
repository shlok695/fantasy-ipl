"use client";

import Image from "next/image";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";
import { getTopByMetric, getTopPlayersAcrossLeague } from "@/lib/leagueData";
import { getPlayerImage } from "@/lib/playerIndex";

export default function PlayersPage() {
  const { loading, derived } = useLeagueData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  const leaders = [
    { title: "Fantasy Points", stat: "totalPoints" as const, suffix: "pts" },
    { title: "Runs", stat: "totalRuns" as const, suffix: "runs" },
    { title: "Wickets", stat: "totalWickets" as const, suffix: "wkts" },
    { title: "50s", stat: "innings50s" as const, suffix: "fifties" },
    { title: "100s", stat: "innings100s" as const, suffix: "hundreds" },
  ];
  const topPlayers = getTopPlayersAcrossLeague(derived.aggregatedPlayers, 16);

  return (
    <div className="space-y-8">
      <LeaguePageHeader
        eyebrow="Players"
        title="Player Stats Center"
        description="Track fantasy points, runs, wickets, fifties, and centuries across the entire league from one dedicated player hub."
        primaryHref="/season"
        primaryLabel="Season Awards"
        secondaryHref="/teams"
        secondaryLabel="Team Squads"
      />

      <section className="grid gap-5 xl:grid-cols-5">
        {leaders.map((leader) => {
          const best = getTopByMetric(derived.aggregatedPlayers, leader.stat, 1)[0];
          return (
            <article key={leader.title} className="glass-panel rounded-[26px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{leader.title}</p>
              <p className="mt-3 truncate text-xl font-black text-white">{best?.name || "Waiting"}</p>
              <p className="mt-2 text-3xl font-black text-cyan-200">{best ? `${Math.round(Number(best[leader.stat]))}` : "0"}</p>
              <p className="mt-1 text-xs text-slate-400">{leader.suffix}</p>
            </article>
          );
        })}
      </section>

      <section className="glass-panel rounded-[30px] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">League Table</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Top Players</h2>
        <div className="mt-5 grid gap-3">
          {topPlayers.map((player, index) => (
            <div key={player.id} className="grid items-center gap-4 rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-3 md:grid-cols-[56px_minmax(0,1.5fr)_repeat(5,minmax(0,1fr))]">
              <div className="text-lg font-black text-slate-300">#{index + 1}</div>
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src={getPlayerImage(player.name, player.role || undefined)}
                  alt={player.name}
                  width={52}
                  height={52}
                  className="h-13 w-13 rounded-2xl border border-white/15 bg-slate-950 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{player.name}</p>
                  <p className="truncate text-xs text-slate-400">{player.user?.name || player.iplTeam || player.role || "League Player"}</p>
                </div>
              </div>
              <StatCell label="Points" value={Math.round(player.totalPoints)} />
              <StatCell label="Runs" value={player.totalRuns} />
              <StatCell label="Wickets" value={player.totalWickets} />
              <StatCell label="50s" value={player.innings50s} />
              <StatCell label="100s" value={player.innings100s} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

