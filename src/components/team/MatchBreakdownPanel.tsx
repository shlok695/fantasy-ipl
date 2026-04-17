"use client";

import { Activity, FileText } from "lucide-react";
import {
  getTeamMatchDateLabel,
  type TeamMatchBreakdown,
} from "@/lib/teamHistory";
import { PointsBreakdownTable } from "@/components/team/PointsBreakdownTable";
import { withBasePath } from "@/lib/basePath";

export function MatchBreakdownPanel({
  title,
  subtitle,
  matches,
  emptyMessage,
  showAuditLink = false,
}: {
  title: string;
  subtitle: string;
  matches: TeamMatchBreakdown[];
  emptyMessage: string;
  /** When true (e.g. admin), show a link to the generated calculation doc for each match. */
  showAuditLink?: boolean;
}) {
  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <Activity className="text-cyan-300" />
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-gray-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const matchDateLabel = getTeamMatchDateLabel(match);

            return (
            <article key={match.matchId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{match.compactMatchLabel}</p>
                  <p className="mt-1 text-lg font-black text-white">{match.matchLabel}</p>
                  {matchDateLabel && (
                    <p className="mt-1 text-xs font-semibold text-cyan-200/80">
                      {matchDateLabel}
                    </p>
                  )}
                  {showAuditLink && (
                    <a
                      href={withBasePath(`/api/match-calculations/${encodeURIComponent(match.matchId)}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400/90 hover:text-cyan-300 underline-offset-4 hover:underline"
                    >
                      <FileText size={14} className="shrink-0" />
                      View full audit (markdown)
                    </a>
                  )}
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Player Match Points</p>
                  <p className="text-2xl font-black text-cyan-200">{Math.round(match.totalPoints)}</p>
                  {match.bonusPoints > 0 && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-300/90">
                      +{Math.round(match.bonusPoints)} bonus shown below
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {match.bonuses.map((bonusRow) => (
                  <div
                    key={`${match.matchId}-${bonusRow.kind}-${bonusRow.teamCode}`}
                    className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-amber-100">{bonusRow.label}</p>
                        <p className="truncate text-xs text-amber-100/70">
                          {bonusRow.description}
                        </p>
                      </div>
                      <p className="text-lg font-black text-amber-300 tabular-nums sm:text-right shrink-0">
                        {Math.round(bonusRow.points)} pts
                      </p>
                    </div>
                  </div>
                ))}
                {match.players.map((playerRow) => (
                  <div
                    key={`${match.matchId}-${playerRow.playerId}`}
                    className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{playerRow.playerName}</p>
                        <p className="truncate text-xs text-gray-400">
                          {playerRow.role || "Player"} • IPL {playerRow.iplTeam?.trim() || "—"}
                        </p>
                      </div>
                      <p className="text-lg font-black text-emerald-300 tabular-nums sm:text-right shrink-0">
                        {Math.round(playerRow.points)} pts
                      </p>
                    </div>
                    <details className="mt-3 rounded-lg border border-white/8 bg-black/20">
                      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/90">
                        View calculation
                      </summary>
                      <div className="px-3 pb-3">
                        <PointsBreakdownTable breakdownJson={playerRow.entry.breakdownJson} />
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </article>
          )})}
        </div>
      )}
    </section>
  );
}
