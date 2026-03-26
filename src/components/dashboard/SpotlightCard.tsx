import Image from "next/image";
import { Star } from "lucide-react";
import { getPlayerImage } from "@/lib/playerIndex";
import type { SpotlightItem } from "@/components/dashboard/types";

export function SpotlightCard({ label, statLabel, statValue, accentClass, player }: SpotlightItem) {
  return (
    <article className="group glass-panel relative overflow-hidden rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_70px_rgba(168,85,247,0.18)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-60 transition-opacity duration-300 group-hover:opacity-80`} />
      <div className="relative space-y-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-200">
            {label}
          </span>
          <Star size={16} className="text-white/70" />
        </div>

        <div className="flex items-center gap-4">
          <Image
            src={getPlayerImage(player.name, player.role || undefined)}
            alt={player.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl border border-white/15 bg-slate-950/80 object-cover"
          />
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black text-white">{player.name}</h3>
            <p className="truncate text-sm text-slate-300">
              {player.iplTeam || player.user?.name || player.role || "League Standout"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{statLabel}</p>
            <p className="mt-1 text-2xl font-black text-white">{statValue}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Fantasy Pts</p>
            <p className="mt-1 text-2xl font-black text-white">{Math.round(player.totalPoints)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
