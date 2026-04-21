"use client";

import Image from "next/image";
import { useState, type ElementType, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { DashboardPlayer } from "@/components/dashboard/types";
import {
  getPlayerPointHistory,
  getPointEntryDateLabel,
  getPointEntryMatchLabel,
} from "@/lib/teamHistory";
import { getPlayerTotalPoints } from "@/lib/teamMetrics";
import { getPlayerImage } from "@/lib/playerIndex";
import { PointsBreakdownTable } from "@/components/team/PointsBreakdownTable";

type Variant = "franchise" | "league";

export function ExpandableSquadPlayerRow({
  player,
  rank,
  isStarter,
  captainId,
  viceCaptainId,
  variant = "franchise",
  countryFlag,
  allowExpand = true,
}: {
  player: DashboardPlayer;
  rank: number;
  isStarter: boolean;
  captainId?: string | null;
  viceCaptainId?: string | null;
  variant?: Variant;
  countryFlag?: ReactNode;
  allowExpand?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const totalPoints = getPlayerTotalPoints(player);
  const history = getPlayerPointHistory(player);

  const shell =
    variant === "league"
      ? "rounded-[24px] border border-white/10 bg-slate-950/45"
      : `rounded-2xl border ${
          isStarter ? "border-white/5 bg-black/25" : "border-white/5 bg-black/20"
        }`;

  const rankRing =
    variant === "league"
      ? "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white"
      : `w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 ${
          isStarter ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300" : "bg-white/5 border border-white/10 text-gray-400"
        }`;

  const imgClass =
    variant === "league"
      ? "h-14 w-14 rounded-2xl border border-white/15 bg-slate-950 object-cover shrink-0"
      : "w-12 h-12 rounded-xl object-cover border border-white/10 bg-black shrink-0";

  const Element: ElementType = allowExpand ? "button" : "div";
  const metaLine = (
    <>
      {player.role || "Player"}
      {variant === "franchise" && player.type ? ` • ${player.type}` : ""}
      {" • "}
      <span className="text-indigo-300/95 font-semibold">IPL {player.iplTeam?.trim() || "—"}</span>
    </>
  );

  return (
    <div className={shell}>
      <Element
        {...(allowExpand
          ? {
              type: "button",
              onClick: () => setOpen((value) => !value),
              "aria-expanded": open,
            }
          : {})}
        className={[
          "w-full text-left rounded-[inherit]",
          variant === "franchise"
            ? "px-4 py-4 space-y-4"
            : "px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4",
          allowExpand ? "transition-colors hover:bg-white/[0.04]" : "",
        ].filter(Boolean).join(" ")}
      >
        {variant === "franchise" ? (
          <>
            <div className="flex items-start gap-3">
              <div className={rankRing}>{rank}</div>
              <Image
                src={getPlayerImage(player.name, player.role || undefined)}
                alt={player.name}
                width={48}
                height={48}
                className={imgClass}
              />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="font-bold text-white leading-tight break-words">{player.name}</p>
                  {captainId === player.id && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">C</span>
                  )}
                  {viceCaptainId === player.id && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">VC</span>
                  )}
                  {countryFlag}
                </div>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed break-words">
                  {metaLine}
                </p>
              </div>
              {allowExpand ? (
                <ChevronDown
                  size={22}
                  className={`mt-1 text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Price</p>
                <p className="text-emerald-400 font-bold text-sm sm:text-base">
                  ₹{player.auctionPrice?.toFixed(1) ?? "0.0"} Cr
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Status</p>
                <p className={`font-bold text-sm sm:text-base ${isStarter ? "text-indigo-300" : "text-gray-400"}`}>
                  {isStarter ? "Top 11" : "Bench"}
                </p>
              </div>
              <div className="min-w-0 text-left sm:text-right">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Points</p>
                <p className="text-white font-black text-lg sm:text-2xl tabular-nums">{totalPoints}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={rankRing}>{rank}</div>
              <Image
                src={getPlayerImage(player.name, player.role || undefined)}
                alt={player.name}
                width={56}
                height={56}
                className={imgClass}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold truncate text-white">{player.name}</p>
                  {captainId === player.id && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">C</span>
                  )}
                  {viceCaptainId === player.id && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">VC</span>
                  )}
                  {countryFlag}
                </div>
                <p className="text-xs text-gray-400 truncate">{metaLine}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0">
              <div className="text-left sm:text-right min-w-[4rem]">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Points</p>
                <p className="text-white font-black text-lg tabular-nums">{totalPoints}</p>
              </div>
              {allowExpand ? (
                <ChevronDown
                  size={22}
                  className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              ) : null}
            </div>
          </>
        )}
      </Element>

      {allowExpand && open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-2 bg-black/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            Points by match
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No scoring entries yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {history.map((entry) => {
                const label = entry.matchId
                  ? getPointEntryMatchLabel(entry, "standard")
                  : "Manual adjustment";
                const dateLine = getPointEntryDateLabel(entry);
                return (
                  <li
                    key={entry.id || `${player.id}-${entry.matchId ?? "adj"}-${entry.createdAt}`}
                    className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-200 truncate">{label}</p>
                        {dateLine && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{dateLine}</p>
                        )}
                      </div>
                      <span className="font-black text-emerald-300 tabular-nums shrink-0 sm:text-right">
                        {Math.round(entry.points ?? 0)} pts
                      </span>
                    </div>
                    <PointsBreakdownTable breakdownJson={entry.breakdownJson} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
