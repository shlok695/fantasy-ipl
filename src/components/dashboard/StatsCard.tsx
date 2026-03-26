import type { StatItem } from "@/components/dashboard/types";

export function StatsCard({ icon: Icon, label, value, accent = "from-cyan-400/30 to-fuchsia-500/20" }: StatItem) {
  return (
    <div className="group glass-panel relative overflow-hidden rounded-[24px] px-4 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_60px_rgba(34,211,238,0.12)] sm:px-5">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-50 transition-opacity duration-300 group-hover:opacity-80`} />
      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p>
          <p className="truncate text-lg font-black text-white sm:text-xl">{value}</p>
        </div>
      </div>
    </div>
  );
}
