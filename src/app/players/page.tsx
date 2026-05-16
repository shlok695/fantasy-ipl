"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Star } from "lucide-react";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";
import { getTopByMetric, getTopPlayersAcrossLeague } from "@/lib/leagueData";
import { getPlayerImage } from "@/lib/playerIndex";
import type { AggregatedPlayer } from "@/lib/leagueData";

type SortKey =
  | "totalPoints"
  | "totalRuns"
  | "totalWickets"
  | "innings50s"
  | "innings100s"
  | "matches"
  | "sr";

type SortDirection = "asc" | "desc";

const sortableColumns: Array<{
  key: SortKey;
  label: string;
  shortLabel: string;
}> = [
  { key: "totalPoints", label: "Fantasy Points", shortLabel: "Points" },
  { key: "totalRuns", label: "Runs", shortLabel: "Runs" },
  { key: "totalWickets", label: "Wickets", shortLabel: "Wickets" },
  { key: "innings50s", label: "Fifties", shortLabel: "50s" },
  { key: "innings100s", label: "Hundreds", shortLabel: "100s" },
  { key: "matches", label: "Matches", shortLabel: "Matches" },
  { key: "sr", label: "Strike Rate", shortLabel: "SR" },
];

function sortPlayers(
  players: AggregatedPlayer[],
  sortKey: SortKey,
  sortDirection: SortDirection
) {
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...players].sort((a, b) => {
    const metricDelta = (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0);
    if (metricDelta !== 0) {
      return metricDelta * direction;
    }

    const pointsDelta = a.totalPoints - b.totalPoints;
    if (pointsDelta !== 0) {
      return pointsDelta * direction;
    }

    return a.name.localeCompare(b.name);
  });
}

function formatPlayerValue(player: AggregatedPlayer, sortKey: SortKey) {
  if (sortKey === "sr") {
    return player.sr.toFixed(1);
  }

  return `${Math.round(Number(player[sortKey]) || 0)}`;
}

export default function PlayersPage() {
  const { loading, derived } = useLeagueData();
  const [sortKey, setSortKey] = useState<SortKey>("totalPoints");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [query, setQuery] = useState("");

  const leaders = [
    {
      title: "Fantasy Points",
      stat: "totalPoints" as const,
      statLabel: "Fantasy Pts",
      secondaryLabel: "Matches",
      accentClass: "from-cyan-400/20 to-blue-500/15",
    },
    {
      title: "Runs",
      stat: "totalRuns" as const,
      statLabel: "Runs",
      secondaryLabel: "Fantasy Pts",
      accentClass: "from-orange-500/25 to-amber-400/15",
    },
    {
      title: "Wickets",
      stat: "totalWickets" as const,
      statLabel: "Wickets",
      secondaryLabel: "Fantasy Pts",
      accentClass: "from-violet-500/25 to-fuchsia-500/15",
    },
    {
      title: "50s",
      stat: "innings50s" as const,
      statLabel: "Half-Centuries",
      secondaryLabel: "Fantasy Pts",
      accentClass: "from-emerald-400/20 to-teal-500/15",
    },
    {
      title: "100s",
      stat: "innings100s" as const,
      statLabel: "Centuries",
      secondaryLabel: "Fantasy Pts",
      accentClass: "from-sky-400/20 to-indigo-500/15",
    },
  ];
  const sortedPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredPlayers = normalizedQuery
      ? derived.aggregatedPlayers.filter((player) => {
          return [
            player.name,
            player.user?.name,
            player.iplTeam,
            player.role,
            player.country,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        })
      : derived.aggregatedPlayers;

    return sortPlayers(filteredPlayers, sortKey, sortDirection);
  }, [derived.aggregatedPlayers, query, sortDirection, sortKey]);

  const topPlayers = getTopPlayersAcrossLeague(derived.aggregatedPlayers, 16);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const setSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("desc");
  };

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

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {leaders.map((leader) => {
          const best = getTopByMetric(derived.aggregatedPlayers, leader.stat, 1)[0];
          return (
            <PlayerLeaderCard
              key={leader.title}
              title={leader.title}
              statLabel={leader.statLabel}
              statValue={best ? Math.round(Number(best[leader.stat])) : 0}
              secondaryLabel={leader.secondaryLabel}
              secondaryValue={leader.stat === "totalPoints" ? Math.round(best?.matches || 0) : Math.round(best?.totalPoints || 0)}
              accentClass={leader.accentClass}
              player={best}
            />
          );
        })}
      </section>

      <section className="glass-panel rounded-[30px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">League Table</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Sortable Player Rankings</h2>
            <p className="mt-2 text-sm text-slate-400">
              Click any stat header to flip between ascending and descending order.
            </p>
          </div>
          <label className="relative block w-full lg:w-80">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player, team, role"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-11 pr-4 text-sm font-semibold text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[980px] space-y-3">
            <div className="grid items-center gap-4 px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 md:grid-cols-[56px_minmax(220px,1.5fr)_repeat(7,minmax(92px,1fr))]">
              <span>Rank</span>
              <span>Player</span>
              {sortableColumns.map((column) => (
                <button
                  key={column.key}
                  type="button"
                  onClick={() => setSort(column.key)}
                  className={`inline-flex items-center gap-1 text-left transition-colors hover:text-cyan-200 ${
                    sortKey === column.key ? "text-cyan-200" : ""
                  }`}
                  title={`Sort by ${column.label}`}
                >
                  {column.shortLabel}
                  {sortKey === column.key ? (
                    sortDirection === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} />
                  )}
                </button>
              ))}
            </div>

            {sortedPlayers.map((player, index) => (
              <div key={player.id} className="grid items-center gap-4 rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-3 md:grid-cols-[56px_minmax(220px,1.5fr)_repeat(7,minmax(92px,1fr))]">
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
                {sortableColumns.map((column) => (
                  <StatCell
                    key={column.key}
                    label={column.shortLabel}
                    value={formatPlayerValue(player, column.key)}
                    active={sortKey === column.key}
                  />
                ))}
              </div>
            ))}

            {sortedPlayers.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-8 text-center text-sm text-slate-400">
                No players match that search.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[30px] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Default View</p>
        <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Top 16 By Fantasy Points</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {topPlayers.slice(0, 8).map((player, index) => (
            <article key={player.id} className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">#{index + 1} Overall</p>
              <p className="mt-2 truncate text-base font-black text-white">{player.name}</p>
              <p className="mt-1 text-xs text-slate-400">{player.user?.name || player.iplTeam || "League Player"}</p>
              <p className="mt-3 text-2xl font-black text-cyan-200">{Math.round(player.totalPoints)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCell({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${active ? "text-cyan-200" : "text-white"}`}>{value}</p>
    </div>
  );
}

function PlayerLeaderCard({
  title,
  statLabel,
  statValue,
  secondaryLabel,
  secondaryValue,
  accentClass,
  player,
}: {
  title: string;
  statLabel: string;
  statValue: number;
  secondaryLabel: string;
  secondaryValue: number;
  accentClass: string;
  player?: AggregatedPlayer;
}) {
  return (
    <article className="group glass-panel relative overflow-hidden rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_70px_rgba(168,85,247,0.18)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-60 transition-opacity duration-300 group-hover:opacity-80`} />
      <div className="relative space-y-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-200">
            {title}
          </span>
          <Star size={16} className="text-white/70" />
        </div>

        <div className="flex items-center gap-4">
          <Image
            src={getPlayerImage(player?.name || "League Player", player?.role || undefined)}
            alt={player?.name || "League Player"}
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl border border-white/15 bg-slate-950/80 object-cover"
          />
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black text-white">{player?.name || "Waiting"}</h3>
            <p className="truncate text-sm text-slate-300">
              {player?.iplTeam || player?.user?.name || player?.role || "League Standout"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{statLabel}</p>
            <p className="mt-1 text-2xl font-black text-white">{statValue}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{secondaryLabel}</p>
            <p className="mt-1 text-2xl font-black text-white">{secondaryValue}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

