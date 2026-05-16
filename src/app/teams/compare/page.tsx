"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Crown,
  Scale,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { LeaguePageHeader } from "@/components/league/LeaguePageHeader";
import { LoadingSkeleton } from "@/components/league/LoadingSkeleton";
import { useLeagueData } from "@/components/league/useLeagueData";
import { getPlayerTotalPoints, sortPlayersByPoints } from "@/lib/teamMetrics";
import type { DashboardPlayer, TeamSummary } from "@/components/dashboard/types";

type Metric = {
  label: string;
  leftValue: string;
  rightValue: string;
  leftNumber: number;
  rightNumber: number;
  higherIsBetter?: boolean;
};

function formatPoints(value: number) {
  return `${Math.round(value)} pts`;
}

function formatBudget(value: number) {
  return `${value.toFixed(1)} Cr`;
}

function getRoleBreakdown(players: DashboardPlayer[] = []) {
  return players.reduce<Record<string, number>>((breakdown, player) => {
    const role = player.role || "Player";
    breakdown[role] = (breakdown[role] || 0) + 1;
    return breakdown;
  }, {});
}

function getAveragePlayerPoints(summary: TeamSummary | null) {
  if (!summary || summary.playerCount === 0) {
    return 0;
  }

  return summary.points / summary.playerCount;
}

function TeamSelect({
  id,
  label,
  value,
  teams,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  teams: TeamSummary[];
  onChange: (teamId: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-cyan-300/50"
      >
        {teams.map((summary) => (
          <option key={summary.team.id} value={summary.team.id}>
            #{summary.rank} {summary.team.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdvantageBadge({
  leftNumber,
  rightNumber,
  higherIsBetter = true,
}: {
  leftNumber: number;
  rightNumber: number;
  higherIsBetter?: boolean;
}) {
  const delta = leftNumber - rightNumber;

  if (Math.abs(delta) < 0.001) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300">
        Even
      </span>
    );
  }

  const leftAhead = higherIsBetter ? delta > 0 : delta < 0;

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
        leftAhead
          ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
          : "border-rose-400/25 bg-rose-400/10 text-rose-200"
      }`}
    >
      {leftAhead ? "Left Edge" : "Right Edge"}
    </span>
  );
}

function MetricComparison({ metric }: { metric: Metric }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
          {metric.label}
        </p>
        <AdvantageBadge
          leftNumber={metric.leftNumber}
          rightNumber={metric.rightNumber}
          higherIsBetter={metric.higherIsBetter}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3">
          <p className="text-2xl font-black text-white">{metric.leftValue}</p>
        </div>
        <div className="rounded-2xl border border-rose-400/15 bg-rose-400/8 px-4 py-3 text-right">
          <p className="text-2xl font-black text-white">{metric.rightValue}</p>
        </div>
      </div>
    </article>
  );
}

function TeamSnapshot({
  summary,
  side,
}: {
  summary: TeamSummary;
  side: "left" | "right";
}) {
  const tone = side === "left" ? "text-cyan-200" : "text-rose-200";
  const topPlayer = summary.topPlayers[0];

  return (
    <section className="glass-panel rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Rank #{summary.rank}
          </p>
          <h2 className="mt-2 truncate font-display text-3xl font-black uppercase text-white">
            {summary.team.name}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {topPlayer
              ? `${topPlayer.name} leads this squad with ${formatPoints(getPlayerTotalPoints(topPlayer))}.`
              : "This squad is waiting for its first major scorer."}
          </p>
        </div>
        <div className={`rounded-2xl border border-white/10 bg-white/8 p-3 ${tone}`}>
          <Shield size={20} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <SnapshotTile icon={Crown} label="Points" value={formatPoints(summary.points)} accent={tone} />
        <SnapshotTile icon={Users} label="Squad" value={`${summary.playerCount}`} accent={tone} />
        <SnapshotTile icon={Wallet} label="Budget" value={formatBudget(summary.budget)} accent={tone} />
        <SnapshotTile icon={TrendingUp} label="Latest" value={formatPoints(summary.recentTrend)} accent={tone} />
      </div>
    </section>
  );
}

function SnapshotTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function TopPlayersColumn({
  title,
  players,
}: {
  title: string;
  players: DashboardPlayer[];
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
        {title}
      </p>
      <div className="mt-4 space-y-3">
        {players.slice(0, 5).map((player, index) => (
          <div
            key={player.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                #{index + 1} {player.name}
              </p>
              <p className="truncate text-xs text-slate-400">{player.role || "Player"}</p>
            </div>
            <span className="shrink-0 text-sm font-black text-cyan-200">
              {Math.round(getPlayerTotalPoints(player))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, derived } = useLeagueData();

  const summaries = derived.teamSummaries;
  const firstTeamId = searchParams.get("left") || summaries[0]?.team.id || "";
  const secondTeamId =
    searchParams.get("right") ||
    summaries.find((summary) => summary.team.id !== firstTeamId)?.team.id ||
    "";

  const left = summaries.find((summary) => summary.team.id === firstTeamId) || summaries[0] || null;
  const right =
    summaries.find((summary) => summary.team.id === secondTeamId && summary.team.id !== left?.team.id) ||
    summaries.find((summary) => summary.team.id !== left?.team.id) ||
    null;

  const setComparison = (side: "left" | "right", teamId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(side, teamId);

    if (side === "left" && params.get("right") === teamId) {
      const fallback = summaries.find((summary) => summary.team.id !== teamId);
      if (fallback) params.set("right", fallback.team.id);
    }

    if (side === "right" && params.get("left") === teamId) {
      const fallback = summaries.find((summary) => summary.team.id !== teamId);
      if (fallback) params.set("left", fallback.team.id);
    }

    router.replace(`/teams/compare?${params.toString()}`, { scroll: false });
  };

  const comparisonMetrics = useMemo<Metric[]>(() => {
    if (!left || !right) return [];

    return [
      {
        label: "Total Points",
        leftValue: formatPoints(left.points),
        rightValue: formatPoints(right.points),
        leftNumber: left.points,
        rightNumber: right.points,
      },
      {
        label: "League Rank",
        leftValue: `#${left.rank}`,
        rightValue: `#${right.rank}`,
        leftNumber: left.rank,
        rightNumber: right.rank,
        higherIsBetter: false,
      },
      {
        label: "Latest Match",
        leftValue: formatPoints(left.recentTrend),
        rightValue: formatPoints(right.recentTrend),
        leftNumber: left.recentTrend,
        rightNumber: right.recentTrend,
      },
      {
        label: "Squad Size",
        leftValue: `${left.playerCount}`,
        rightValue: `${right.playerCount}`,
        leftNumber: left.playerCount,
        rightNumber: right.playerCount,
      },
      {
        label: "Budget Left",
        leftValue: formatBudget(left.budget),
        rightValue: formatBudget(right.budget),
        leftNumber: left.budget,
        rightNumber: right.budget,
      },
      {
        label: "Avg Player Points",
        leftValue: formatPoints(getAveragePlayerPoints(left)),
        rightValue: formatPoints(getAveragePlayerPoints(right)),
        leftNumber: getAveragePlayerPoints(left),
        rightNumber: getAveragePlayerPoints(right),
      },
    ];
  }, [left, right]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (summaries.length < 2 || !left || !right) {
    return (
      <div className="space-y-8">
        <LeaguePageHeader
          eyebrow="Team Compare"
          title="Head-To-Head"
          description="Add at least two fantasy teams to unlock direct comparisons."
          primaryHref="/teams"
          primaryLabel="Back to Teams"
          secondaryHref="/leaderboard"
          secondaryLabel="Open Rankings"
        />
      </div>
    );
  }

  const leftRoles = getRoleBreakdown(left.team.players || []);
  const rightRoles = getRoleBreakdown(right.team.players || []);
  const roleNames = Array.from(new Set([...Object.keys(leftRoles), ...Object.keys(rightRoles)])).sort();

  return (
    <div className="space-y-8">
      <LeaguePageHeader
        eyebrow="Team Compare"
        title="Head-To-Head"
        description="Pick any two fantasy franchises and compare rank, points, form, squad depth, budget, and top performers side by side."
        primaryHref="/teams"
        primaryLabel="Back to Teams"
        secondaryHref="/leaderboard"
        secondaryLabel="Open Rankings"
      />

      <section className="glass-panel rounded-[28px] p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
          <TeamSelect
            id="left-team"
            label="Team One"
            value={left.team.id}
            teams={summaries}
            onChange={(teamId) => setComparison("left", teamId)}
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("left", right.team.id);
                params.set("right", left.team.id);
                router.replace(`/teams/compare?${params.toString()}`, { scroll: false });
              }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-cyan-200 transition-colors hover:border-cyan-300/40 hover:bg-cyan-400/10"
              aria-label="Swap teams"
              title="Swap teams"
            >
              <ArrowRightLeft size={18} />
            </button>
          </div>
          <TeamSelect
            id="right-team"
            label="Team Two"
            value={right.team.id}
            teams={summaries.filter((summary) => summary.team.id !== left.team.id)}
            onChange={(teamId) => setComparison("right", teamId)}
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <TeamSnapshot summary={left} side="left" />
        <TeamSnapshot summary={right} side="right" />
      </section>

      <section className="glass-panel rounded-[30px] p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-cyan-200">
            <Scale size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Comparison Matrix
            </p>
            <h2 className="font-display text-2xl font-black uppercase text-white">
              {left.team.name} vs {right.team.name}
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {comparisonMetrics.map((metric) => (
            <MetricComparison key={metric.label} metric={metric} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel rounded-[30px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Top Contributors
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <TopPlayersColumn title={left.team.name} players={sortPlayersByPoints(left.team.players || [])} />
            <TopPlayersColumn title={right.team.name} players={sortPlayersByPoints(right.team.players || [])} />
          </div>
        </div>

        <aside className="glass-panel rounded-[30px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Role Balance
          </p>
          <div className="mt-5 space-y-3">
            {roleNames.map((role) => (
              <div key={role} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold text-white">{role}</p>
                  <p className="shrink-0 text-xs font-semibold text-slate-400">
                    {leftRoles[role] || 0} - {rightRoles[role] || 0}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${Math.min((leftRoles[role] || 0) * 18, 100)}%` }}
                    />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-rose-300"
                      style={{ width: `${Math.min((rightRoles[role] || 0) * 18, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href={`/teams/${left.team.id}`}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/10"
          >
            Open {left.team.name}
          </Link>
          <Link
            href={`/teams/${right.team.id}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white transition-colors hover:border-rose-300/30 hover:bg-rose-400/10"
          >
            Open {right.team.name}
          </Link>
        </aside>
      </section>
    </div>
  );
}
