"use client";

import { LayoutGrid, History } from "lucide-react";

export type TeamViewTabId = "overview" | "matches";

type Variant = "franchise" | "league";

export function TeamViewTabs({
  active,
  onChange,
  variant = "franchise",
}: {
  active: TeamViewTabId;
  onChange: (tab: TeamViewTabId) => void;
  variant?: Variant;
}) {
  const base =
    variant === "league"
      ? "rounded-2xl border border-white/10 bg-slate-950/45 p-1 flex gap-1"
      : "rounded-2xl border border-white/10 bg-black/30 p-1 flex gap-1";

  const activeBtn =
    variant === "league"
      ? "bg-cyan-400/15 border border-cyan-400/30 text-cyan-100 shadow-sm"
      : "bg-indigo-500/25 border border-indigo-500/40 text-white shadow-sm";

  const idleBtn =
    variant === "league"
      ? "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
      : "border border-transparent text-gray-400 hover:bg-white/5 hover:text-white";

  return (
    <div className={base} role="tablist" aria-label="Team sections">
      <button
        type="button"
        role="tab"
        aria-selected={active === "overview"}
        onClick={() => onChange("overview")}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all sm:px-6 ${
          active === "overview" ? activeBtn : idleBtn
        }`}
      >
        <LayoutGrid size={18} className="shrink-0 opacity-90" />
        Overview
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "matches"}
        onClick={() => onChange("matches")}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all sm:px-6 ${
          active === "matches" ? activeBtn : idleBtn
        }`}
      >
        <History size={18} className="shrink-0 opacity-90" />
        Match History
      </button>
    </div>
  );
}
