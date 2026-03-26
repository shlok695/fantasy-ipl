import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Crown, Users, Wallet } from "lucide-react";
import { getPlayerImage } from "@/lib/playerIndex";
import { getPlayerTotalPoints } from "@/lib/teamMetrics";
import type { DashboardTeam, TeamSummary } from "@/components/dashboard/types";

function rankBadgeClass(rank: number) {
  if (rank === 1) return "border-[#F5C451]/50 bg-[#F5C451]/14 text-[#F5C451]";
  if (rank === 2) return "border-slate-300/40 bg-slate-300/12 text-slate-200";
  if (rank === 3) return "border-amber-700/50 bg-amber-700/14 text-amber-400";
  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
}

interface TeamCardProps {
  summary: TeamSummary;
  isAdmin: boolean;
  isCurrentUserTeam: boolean;
  onDeleteTeam: (team: DashboardTeam) => Promise<void>;
  onDropPlayer: (team: DashboardTeam, player: TeamSummary["topPlayers"][number]) => Promise<void>;
  onUpdateBudget: (teamId: string, nextBudget: number) => Promise<void>;
  variant?: "leaderboard" | "podium";
}

export function TeamCard({
  summary,
  isAdmin,
  isCurrentUserTeam,
  onDeleteTeam,
  onDropPlayer,
  onUpdateBudget,
  variant = "leaderboard",
}: TeamCardProps) {
  const { team, rank, points, playerCount, budget, topPlayers, recentTrend } = summary;
  const featured = variant === "podium";

  if (featured) {
    return (
      <article
        className={`group glass-panel dashboard-fade-in relative overflow-hidden rounded-[30px] border p-0 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_28px_90px_rgba(59,130,246,0.15)] ${
          rank === 1 ? "xl:-translate-y-4" : ""
        }`}
      >
        <div
          className={`absolute inset-0 opacity-90 ${
            rank === 1
              ? "bg-[radial-gradient(circle_at_top,_rgba(245,196,81,0.22),_transparent_34%),linear-gradient(180deg,rgba(245,196,81,0.06),transparent_32%)]"
              : rank === 2
                ? "bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.18),_transparent_34%),linear-gradient(180deg,rgba(226,232,240,0.05),transparent_32%)]"
                : "bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.18),_transparent_34%),linear-gradient(180deg,rgba(217,119,6,0.05),transparent_32%)]"
          }`}
        />
        <div className="relative space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-black ${rankBadgeClass(rank)}`}>
                  {rank}
                </div>
                {team.iplTeam ? (
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200">
                    {team.iplTeam}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-4 truncate text-2xl font-black text-white sm:text-3xl">{team.name}</h3>
              <p className="mt-2 text-sm text-slate-300">{rank === 1 ? "League leaders under the lights." : rank === 2 ? "Closest challenger to the crown." : "Still firmly in the title picture."}</p>
            </div>
            {rank === 1 ? <Crown size={22} className="shrink-0 text-[#F5C451]" /> : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MetricTile label="Points" value={`${Math.round(points)}`} accent="text-white" />
            <MetricTile label="Squad" value={`${playerCount}`} accent="text-cyan-200" />
            <MetricTile label="Budget" value={`${budget.toFixed(1)} Cr`} accent="text-cyan-200" />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Users size={13} />
              {playerCount} players
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Wallet size={13} />
              INR {budget.toFixed(1)} Cr left
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-emerald-200">
              <ArrowUpRight size={13} />
              +{recentTrend} latest match
            </span>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Impact Core</p>
                <p className="mt-1 text-sm text-slate-300">Top performers driving this podium push.</p>
              </div>
              <div className="flex -space-x-3">
                {topPlayers.slice(0, 3).map((player) => (
                  <Image
                    key={player.id}
                    src={getPlayerImage(player.name, player.role || undefined)}
                    alt={player.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-2xl border-2 border-[#0b0f1a] bg-slate-950 object-cover"
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {topPlayers.slice(0, 3).map((player, index) => (
                <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-black text-slate-200">
                      #{index + 1}
                    </div>
                    <Image
                      src={getPlayerImage(player.name, player.role || undefined)}
                      alt={player.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-xl border border-white/10 bg-slate-950 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{player.name}</p>
                      <p className="truncate text-xs text-slate-400">{player.role || "Player"}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-cyan-200">{Math.round(getPlayerTotalPoints(player))} pts</span>
                </div>
              ))}
            </div>
          </div>

          {isCurrentUserTeam ? (
            <Link
              href="/team"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
            >
              View Full Squad
            </Link>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="group glass-panel dashboard-fade-in relative overflow-hidden rounded-[28px] border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_28px_90px_rgba(59,130,246,0.15)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/4 via-transparent to-cyan-400/8 opacity-70" />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-black ${rankBadgeClass(rank)}`}>
              {rank}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-black text-white">{team.name}</h3>
                {team.iplTeam ? (
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200">
                    {team.iplTeam}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  <Users size={13} />
                  {playerCount} players
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  <Wallet size={13} />
                  INR {budget.toFixed(1)} Cr
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                  <ArrowUpRight size={13} />
                  +{recentTrend} latest match
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:min-w-[230px]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Total Points</p>
              <p className="mt-1 text-3xl font-black text-white">{Math.round(points)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Budget Left</p>
              {isAdmin ? (
                <input
                  type="number"
                  key={`${team.id}-${budget}`}
                  defaultValue={budget}
                  onBlur={async (event) => {
                    const nextBudget = Number.parseFloat(event.target.value);
                    if (!Number.isNaN(nextBudget) && nextBudget !== budget) {
                      await onUpdateBudget(team.id, nextBudget);
                    }
                  }}
                  className="mt-2 w-full border-b border-cyan-400/20 bg-transparent text-xl font-black text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                />
              ) : (
                <p className="mt-1 text-2xl font-black text-cyan-200">{budget.toFixed(1)} Cr</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Top 3 Players</p>
              <p className="text-sm text-slate-300">Best contributors in the live fantasy standings.</p>
            </div>
            {rank === 1 ? <Crown size={18} className="text-[#F5C451]" /> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {topPlayers.slice(0, 3).map((player, index) => (
              <div key={player.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">#{index + 1} Performer</p>
                <p className="mt-2 truncate text-sm font-bold text-white">{player.name}</p>
                <p className="truncate text-xs text-slate-400">{player.role || "Player"}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-cyan-200">{Math.round(getPlayerTotalPoints(player))} pts</span>
                  {isAdmin ? (
                    <button
                      onClick={() => onDropPlayer(team, player)}
                      className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-rose-200 transition-colors hover:bg-rose-500 hover:text-white"
                    >
                      Drop
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isCurrentUserTeam ? (
            <Link
              href="/team"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
            >
              View Full Squad
            </Link>
          ) : null}
          {isAdmin ? (
            <button
              onClick={() => onDeleteTeam(team)}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-200 transition-colors duration-300 hover:bg-rose-500 hover:text-white"
            >
              Delete Team
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-950/60 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${accent}`}>{value}</p>
    </div>
  );
}
