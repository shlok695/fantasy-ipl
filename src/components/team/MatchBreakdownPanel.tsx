"use client";

import { Activity, FileText } from "lucide-react";
import { formatMatchDateLabel, type TeamMatchBreakdown } from "@/lib/teamHistory";
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
          {matches.map((match) => (
            <article key={match.matchId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{match.compactMatchLabel}</p>
                  <p className="mt-1 text-lg font-black text-white">{match.matchLabel}</p>
                  {formatMatchDateLabel(match.startedAt) && (
                    <p className="mt-1 text-xs font-semibold text-cyan-200/80">
                      {formatMatchDateLabel(match.startedAt)}
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Team Match Points</p>
                  <p className="text-2xl font-black text-cyan-200">{Math.round(match.totalPoints)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {match.players.map((playerRow) => (
                  <div
                    key={`${match.matchId}-${playerRow.playerId}`}
                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                  >
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
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
