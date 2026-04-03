import Link from "next/link";
import { ChevronRight, Sparkles, Trophy } from "lucide-react";
import type { TeamSummary } from "@/components/dashboard/types";

/** Renders 2nd (left), 1st (center, elevated), 3rd (right) — visual podium. */
function FeaturedPodium({ topTeams }: { topTeams: TeamSummary[] }) {
  if (topTeams.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/15 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-400">
        Rankings will appear once teams have points on the board.
      </div>
    );
  }

  if (topTeams.length < 3) {
    return (
      <div className="grid gap-3">
        {topTeams.map((item) => (
          <PodiumMiniCard key={item.team.id} summary={item} emphasize={item.rank === 1} />
        ))}
      </div>
    );
  }

  const second = topTeams[1];
  const first = topTeams[0];
  const third = topTeams[2];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4">
      <div className="w-[32%] max-w-[200px] flex-1 pb-6 sm:pb-8">
        <PodiumMiniCard summary={second} emphasize={false} slot="second" />
      </div>
      <div className="w-[36%] max-w-[220px] flex-1 z-10 -translate-y-3 sm:-translate-y-5 scale-[1.03] sm:scale-105">
        <PodiumMiniCard summary={first} emphasize slot="first" />
      </div>
      <div className="w-[32%] max-w-[200px] flex-1 pb-10 sm:pb-14">
        <PodiumMiniCard summary={third} emphasize={false} slot="third" />
      </div>
    </div>
  );
}

function podiumSlotClass(slot: "first" | "second" | "third", emphasize: boolean) {
  if (emphasize) {
    return "border-[#F5C451]/55 bg-[#F5C451]/16 text-[#F5C451] shadow-[0_20px_60px_rgba(245,196,81,0.12)]";
  }
  if (slot === "second") {
    return "border-slate-300/40 bg-slate-300/12 text-slate-200";
  }
  return "border-amber-800/45 bg-amber-800/14 text-amber-400";
}

function PodiumMiniCard({
  summary,
  emphasize,
  slot = "first",
}: {
  summary: TeamSummary;
  emphasize?: boolean;
  slot?: "first" | "second" | "third";
}) {
  const ring = emphasize ? "ring-2 ring-[#F5C451]/35" : "";
  return (
    <div
      className={`rounded-[24px] border px-3 py-4 transition-all duration-300 hover:scale-[1.01] sm:px-4 sm:py-5 ${podiumSlotClass(
        slot,
        Boolean(emphasize)
      )} ${ring}`}
    >
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] opacity-85">Rank {summary.rank}</p>
        <h3 className="truncate text-base font-black text-white sm:text-lg">{summary.team.name}</h3>
        <p className="truncate text-[11px] text-slate-300">{summary.playerCount} players</p>
        <div className="mt-1 border-t border-white/10 pt-2 text-right">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">Points</p>
          <p className="text-xl font-black text-white sm:text-2xl">{Math.round(summary.points)}</p>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ topTeams }: { topTeams: TeamSummary[] }) {
  return (
    <section className="dashboard-hero dashboard-fade-in relative overflow-hidden rounded-[36px] border border-white/10 px-6 py-8 sm:px-8 sm:py-10 xl:px-10">
      <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200">
            <Sparkles size={14} />
            Premium Fantasy Sports Hub
          </div>

          <div className="space-y-4">
            <h1 className="font-display max-w-3xl text-4xl font-black uppercase leading-none text-white sm:text-5xl lg:text-6xl">
              Fantasy IPL League
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Track the title race, spotlight your stars, and stay locked into every ranking swing with a richer fantasy dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_50px_rgba(192,38,211,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_18px_70px_rgba(192,38,211,0.45)]"
            >
              Open Leaderboard
              <ChevronRight size={16} />
            </Link>
            <Link
              href="/teams"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:border-cyan-300/30 hover:bg-cyan-400/10"
            >
              Explore Teams
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-violet-500/30 via-fuchsia-500/15 to-cyan-400/25 blur-xl" />
          <div className="glass-panel relative rounded-[30px] border-white/15 p-5 shadow-[0_30px_120px_rgba(15,23,42,0.55)] sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Featured Podium</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Top 3 Teams</h2>
                <p className="mt-1 text-[11px] text-slate-500">1st center & highest · 2nd left · 3rd right</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/10 text-[#F5C451]">
                <Trophy size={20} />
              </div>
            </div>

            <FeaturedPodium topTeams={topTeams} />
          </div>
        </div>
      </div>
    </section>
  );
}
