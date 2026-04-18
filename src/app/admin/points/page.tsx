"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Plus, TrendingUp, Zap, RefreshCw, CheckCircle, AlertCircle, Search, Trophy, PencilLine, Users, ScrollText, Award } from 'lucide-react';
import { basePath } from '@/lib/basePath';
import { MatchBreakdownPanel } from '@/components/team/MatchBreakdownPanel';
import { PointsBreakdownTable } from '@/components/team/PointsBreakdownTable';
import { getPlayerPointHistory, getPointEntryMatchLabel, getTeamMatchBreakdowns } from '@/lib/teamHistory';

function splitConfiguredValues(value: string) {
  return String(value || '')
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function appendConfiguredMatch(currentIds: string, currentStarts: string, nextId: string, nextStartAt: string) {
  const ids = splitConfiguredValues(currentIds);
  const starts = splitConfiguredValues(currentStarts);
  const trimmedId = String(nextId || '').trim();
  const trimmedStart = String(nextStartAt || '').trim();

  if (!trimmedId) {
    return {
      matchId: currentIds,
      matchStartAt: currentStarts,
    };
  }

  const existingIndex = ids.findIndex((entry) => entry === trimmedId);
  if (existingIndex >= 0) {
    if (trimmedStart) {
      starts[existingIndex] = trimmedStart;
    }
    return {
      matchId: ids.join('\n'),
      matchStartAt: starts.join('\n'),
    };
  }

  ids.push(trimmedId);
  starts.push(trimmedStart);
  return {
    matchId: ids.join('\n'),
    matchStartAt: starts.join('\n'),
  };
}

function getPlayerTotalPoints(player: any) {
  return (player?.points || []).reduce((sum: number, entry: any) => sum + (entry?.points || 0), 0);
}

function getBreakdownSummary(entry: any) {
  if (!entry?.breakdownJson) {
    return entry?.source || 'Stored points';
  }

  try {
    const parsed = JSON.parse(entry.breakdownJson);
    const lines = Array.isArray(parsed?.lines) ? parsed.lines : [];
    const summary = lines.map((line: any) => `${line.label}: ${line.value > 0 ? '+' : ''}${line.value}`);
    if (parsed?.multiplierValue && parsed.multiplierValue !== 1) {
      summary.push(`${parsed.multiplierLabel} x${parsed.multiplierValue}`);
    }
    return summary.join(' • ');
  } catch {
    return entry?.source || 'Stored points';
  }
}

export default function PointsAdmin() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [winningIplTeam, setWinningIplTeam] = useState('');
  const [points, setPoints] = useState('');
  const [playerMode, setPlayerMode] = useState<'add' | 'set'>('add');
  const [matchIdSync, setMatchIdSync] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [matchNumber, setMatchNumber] = useState('');
  const [teamBonusPoints, setTeamBonusPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [seasonAwardsLoading, setSeasonAwardsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [liveSyncConfig, setLiveSyncConfig] = useState({
    matchId: '',
    matchStartAt: '',
    afterOverMinutes: '60',
    intervalMs: '1800000',
    enabled: false,
  });
  const [liveSyncSaving, setLiveSyncSaving] = useState(false);
  const [detectedLiveMatch, setDetectedLiveMatch] = useState<any>(null);
  const [detectedLiveMatches, setDetectedLiveMatches] = useState<any[]>([]);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [showLiveDebug, setShowLiveDebug] = useState(false);
  const [liveDetectionLoading, setLiveDetectionLoading] = useState(false);
  const [lastLiveDetectionAt, setLastLiveDetectionAt] = useState<string | null>(null);
  const [franchiseBreakdownTeam, setFranchiseBreakdownTeam] = useState<any>(null);
  const IPL_TEAMS = ['CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RR', 'RCB', 'SRH'];
  const seasonAwardsApplied = auditLogs.some((log) => log.action === 'SEASON_AWARDS_APPLIED');

  const fetchPlayers = useCallback(async () => {
    try {
      const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
      const res = await fetch(`${basePath}/api/players${query}`, { cache: 'no-store' });
      const data = await res.json();
      setPlayers(data);
    } catch (error) {
      console.error(error);
    }
  }, [search]);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${basePath}/api/teams`, { cache: 'no-store' });
      const data = await res.json();
      setTeams(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${basePath}/api/admin/audit`, { cache: 'no-store' });
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLiveSyncConfig = async (
    { silent = false, forceRefresh = false }: { silent?: boolean; forceRefresh?: boolean } = {}
  ) => {
    if (!silent) {
      setLiveDetectionLoading(true);
    }

    try {
      const query = forceRefresh ? '?refresh=1' : '';
      const res = await fetch(`${basePath}/api/admin/live-sync${query}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.config) {
        setLiveSyncConfig({
          matchId: data.config.matchId || '',
          matchStartAt: data.config.matchStartAt || '',
          afterOverMinutes: String(data.config.afterOverMinutes ?? 60),
          intervalMs: String(data.config.intervalMs ?? 1800000),
          enabled: Boolean(data.config.enabled),
        });
        const configuredMatchIds = splitConfiguredValues(data.config.matchId || '');
        if (configuredMatchIds[0]) {
          setMatchIdSync(configuredMatchIds[0]);
        }
        const detectedMatches = Array.isArray(data.detectedMatches)
          ? data.detectedMatches
          : data.detectedMatch
            ? [data.detectedMatch]
            : [];
        setDetectedLiveMatches(detectedMatches);
        setDetectedLiveMatch(detectedMatches[0] || data.detectedMatch || null);
        setDetectionError(null);
        setLastLiveDetectionAt(new Date().toISOString());
      } else {
        setDetectionError(data.error || 'Failed to fetch live sync config');
      }
    } catch (error) {
      console.error(error);
      setDetectionError('System error connection to sync API');
    } finally {
      if (!silent) {
        setLiveDetectionLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    fetchTeams();
    fetchAuditLogs();
    fetchLiveSyncConfig();
  }, []);

  useEffect(() => {
    if (!selectedPlayer || !matchNumber) {
      return;
    }

    const existingRecord = (selectedPlayer.points || []).find((entry: any) => entry.matchId === String(matchNumber));
    if (playerMode === 'set') {
      setPoints(existingRecord ? String(existingRecord.points) : '');
    }
  }, [selectedPlayer, matchNumber, playerMode]);

  useEffect(() => {
    if (selectedTeam) {
      setTeamBonusPoints(String(selectedTeam.bonusPoints ?? 0));
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (!selectedPlayer) {
      return;
    }

    const refreshedPlayer = players.find((player) => player.id === selectedPlayer.id) || null;

    if (!refreshedPlayer) {
      setSelectedPlayer(null);
      return;
    }

    if (refreshedPlayer !== selectedPlayer) {
      setSelectedPlayer(refreshedPlayer);
    }
  }, [players, selectedPlayer]);

  useEffect(() => {
    if (!selectedTeam) {
      return;
    }

    const refreshedTeam = teams.find((team) => team.id === selectedTeam.id) || null;

    if (!refreshedTeam) {
      setSelectedTeam(null);
      return;
    }

    if (refreshedTeam !== selectedTeam) {
      setSelectedTeam(refreshedTeam);
    }
  }, [teams, selectedTeam]);

  useEffect(() => {
    if (!franchiseBreakdownTeam) {
      return;
    }

    const refreshed = teams.find((team) => team.id === franchiseBreakdownTeam.id) || null;

    if (!refreshed) {
      setFranchiseBreakdownTeam(null);
      return;
    }

    if (refreshed !== franchiseBreakdownTeam) {
      setFranchiseBreakdownTeam(refreshed);
    }
  }, [teams, franchiseBreakdownTeam]);

  const playerMatchHistory = useMemo(() => {
    return getPlayerPointHistory(selectedPlayer);
  }, [selectedPlayer]);

  const franchiseMatchBreakdowns = useMemo(() => {
    return getTeamMatchBreakdowns(franchiseBreakdownTeam);
  }, [franchiseBreakdownTeam]);

  const detectedMatchSlots = useMemo(() => {
    const matches = detectedLiveMatches.length > 0
      ? detectedLiveMatches
      : detectedLiveMatch
        ? [detectedLiveMatch]
        : [];

    return [matches[0] || null, matches[1] || null];
  }, [detectedLiveMatch, detectedLiveMatches]);

  const addDetectedMatchToConfig = (match: any) => {
    if (!match?.id) {
      return;
    }

    setLiveSyncConfig((current) => ({
      ...current,
      enabled: true,
      ...appendConfiguredMatch(
        current.matchId,
        current.matchStartAt,
        String(match.id || ''),
        match.dateTimeGMT ? String(match.dateTimeGMT).slice(0, 16) : ''
      ),
    }));
    setMatchIdSync(String(match.id || ''));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const pointsValue = Number(points);
    const hasMatchNumber = matchNumber.trim() !== '';
    const matchNumberValue = hasMatchNumber ? Number(matchNumber) : null;

    if (!Number.isFinite(pointsValue)) {
      alert('Invalid points value');
      return;
    }

    if (playerMode === 'set' && !hasMatchNumber) {
      alert('Match number is required when editing points');
      return;
    }

    if (
      hasMatchNumber &&
      (matchNumberValue === null || !Number.isInteger(matchNumberValue) || matchNumberValue < 0)
    ) {
      alert('Invalid match number');
      return;
    }

    if (playerMode === 'add' && hasMatchNumber) {
      alert('Add mode is only for manual adjustments without a match number. Use Edit Match Points for match scoring changes.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          points: pointsValue,
          matchNumber: hasMatchNumber ? matchNumberValue : null,
          mode: playerMode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }

      alert(playerMode === 'set' ? `Updated ${selectedPlayer.name}'s match points` : `Added ${points} points to ${selectedPlayer.name}`);
      setPoints('');
      if (playerMode === 'add') {
        setMatchNumber('');
      }
      await fetchPlayers();
      await fetchTeams();
      await fetchAuditLogs();
    } catch {
      alert("Failed to update points");
    } finally {
      setLoading(false);
    }
  };

  const handleTeamUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || teamBonusPoints === '') return;

    setTeamLoading(true);
    try {
      const res = await fetch(`${basePath}/api/admin/team-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam.id,
          bonusPoints: parseFloat(teamBonusPoints)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }

      alert(`Updated bonus points for ${selectedTeam.name}`);
      await fetchTeams();
      await fetchAuditLogs();
    } catch {
      alert("Failed to update team points");
    } finally {
      setTeamLoading(false);
    }
  };

  const syncLiveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchIdSync) return;
    setSyncLoading(true);
    setSyncMessage(null);

    try {
      const res = await fetch(`${basePath}/api/sync-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: matchIdSync })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');

      const providerLabel = data.provider ? ` Provider: ${String(data.provider).toUpperCase()}.` : '';
      const fallbackLabel = data.fallbackReason ? ` Fallback trigger: ${data.fallbackReason}` : '';
      const zeroMatchLabel = data.playersMatched === 0 ? ' No player names matched your local squad, so frontend totals will stay unchanged until names map correctly.' : '';
      setSyncMessage({ type: 'success', text: `${data.message}${providerLabel}${fallbackLabel}${zeroMatchLabel}` });
      setMatchIdSync('');
      await fetchPlayers();
      await fetchTeams();
      await fetchAuditLogs();
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setSyncLoading(false);
    }
  };

  const awardPartnerWinBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winningIplTeam) return;
    setTeamLoading(true);
    try {
      const res = await fetch(`${basePath}/api/admin/match-win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iplTeam: winningIplTeam })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to award partner win bonus');
        return;
      }
      alert(`${winningIplTeam} win bonus applied`);
      await fetchTeams();
      await fetchAuditLogs();
    } catch {
      alert('Failed to award partner win bonus');
    } finally {
      setTeamLoading(false);
    }
  };

  const applySeasonAwards = async () => {
    if (seasonAwardsApplied) {
      alert('Season awards bonus has already been applied');
      return;
    }

    const confirmed = window.confirm('Apply the season-end Orange Cap, Purple Cap, and MVP bonuses now? This should only be done once.');
    if (!confirmed) {
      return;
    }

    setSeasonAwardsLoading(true);
    try {
      const res = await fetch(`${basePath}/api/admin/season-awards`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to apply season awards');
        return;
      }

      const summary = (data.winners || []).map((winner: any) => `${winner.label}: ${winner.playerName} -> ${winner.franchiseName}`).join('\n');
      alert(`Season awards applied.\n\n${summary}`);
      await fetchTeams();
      await fetchAuditLogs();
    } catch {
      alert('Failed to apply season awards');
    } finally {
      setSeasonAwardsLoading(false);
    }
  };

  const saveLiveSyncConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLiveSyncSaving(true);
    setSyncMessage(null);

    try {
      const res = await fetch(`${basePath}/api/admin/live-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: liveSyncConfig.matchId,
          matchStartAt: liveSyncConfig.matchStartAt,
          afterOverMinutes: parseInt(liveSyncConfig.afterOverMinutes, 10),
          intervalMs: parseInt(liveSyncConfig.intervalMs, 10),
          enabled: liveSyncConfig.enabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save live sync settings');

      setLiveSyncConfig({
        matchId: data.config.matchId || '',
        matchStartAt: data.config.matchStartAt || '',
        afterOverMinutes: String(data.config.afterOverMinutes ?? 60),
        intervalMs: String(data.config.intervalMs ?? 1800000),
        enabled: Boolean(data.config.enabled),
      });
      const configuredMatchIds = splitConfiguredValues(data.config.matchId || '');
      setMatchIdSync(configuredMatchIds[0] || '');
      setSyncMessage({
        type: 'success',
        text: `Live auto-sync ${data.config.enabled ? 'enabled' : 'saved as disabled'} for ${configuredMatchIds.length || 0} configured match${configuredMatchIds.length === 1 ? '' : 'es'}.`,
      });
      await fetchAuditLogs();
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setLiveSyncSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 sm:px-0">
      <div className="flex justify-center flex-col items-center gap-3 sm:gap-4 border-b border-indigo-500/20 pb-6 sm:pb-8 pt-2 sm:pt-4">
        <div className="p-2.5 sm:p-4 bg-indigo-500/20 rounded-full text-indigo-400 mb-1 sm:mb-2">
          <Shield size={32} className="sm:w-12 sm:h-12" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white text-center">Admin Points Manager</h1>
        <p className="text-sm sm:text-base text-gray-400 text-center max-w-2xl">Edit player points, team bonus points, and sync match scoring without disturbing the leaderboard rules.</p>
      </div>

      <div className="glass-card p-4 sm:p-6 border border-white/5 bg-gradient-to-r from-violet-500/10 to-transparent">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2.5 sm:p-3 bg-violet-500/20 rounded-full text-violet-300">
            <Users size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Franchise match breakdown</h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Inspect any franchise&apos;s full match-by-match scoring (same data players see on the team page). Open the audit doc when it exists under <code className="text-violet-300/90">docs/match-&#123;id&#125;-calculations.md</code>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setFranchiseBreakdownTeam(team)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
                franchiseBreakdownTeam?.id === team.id
                  ? 'border-violet-400/50 bg-violet-500/20 text-white'
                  : 'border-white/10 bg-black/20 text-gray-300 hover:border-violet-500/30'
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>

        {franchiseBreakdownTeam ? (
          <MatchBreakdownPanel
            title={`${franchiseBreakdownTeam.name} — scoring history`}
            subtitle="Aggregated from all squad players with a match id. Audit links open the generated calculation log (admin-only)."
            matches={franchiseMatchBreakdowns}
            emptyMessage="No match-scored points for this franchise yet."
            showAuditLink
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-gray-500">
            Select a franchise above to load its full match breakdown.
          </div>
        )}
      </div>

      <div className="glass-card p-4 sm:p-6 border border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2.5 sm:p-3 bg-indigo-500/20 rounded-full text-indigo-400 animate-pulse">
            <Zap size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Live API Match Sync</h2>
            <p className="text-xs sm:text-sm text-gray-400">Trigger points engine based on Cricket API live scorecard.</p>
          </div>
        </div>

        {syncMessage && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm ${syncMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {syncMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {syncMessage.text}
          </div>
        )}

        <form onSubmit={syncLiveMatch} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Cricket API Match ID</label>
            <input
              type="text"
              value={matchIdSync}
              onChange={(e) => setMatchIdSync(e.target.value)}
              placeholder="e.g. 12345"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={syncLoading || !matchIdSync}
            className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 text-sm sm:text-base"
          >
            {syncLoading ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
            {syncLoading ? 'Syncing...' : 'Calculate Points'}
          </button>
        </form>
      </div>

      <div className="glass-card p-4 sm:p-6 border border-white/5 bg-gradient-to-r from-cyan-500/10 to-transparent">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2.5 sm:p-3 bg-cyan-500/20 rounded-full text-cyan-300">
            <RefreshCw size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Auto Live Sync Settings</h2>
            <p className="text-xs sm:text-sm text-gray-400">For strict quota mode, pin the detected match and start time. The worker will then sync at 4 scheduled checkpoints only.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchLiveSyncConfig({ forceRefresh: true })}
            disabled={liveDetectionLoading}
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100 disabled:opacity-50"
          >
            {liveDetectionLoading ? 'Refreshing...' : 'Refresh Detection'}
          </button>
          <button
            type="button"
            onClick={() => setShowLiveDebug((current) => !current)}
            className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs font-black text-white"
          >
            {showLiveDebug ? 'Hide API Debug' : 'Show API Debug'}
          </button>
        </div>

        <form onSubmit={saveLiveSyncConfig} className="space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <input
              type="checkbox"
              checked={liveSyncConfig.enabled}
              onChange={(e) => setLiveSyncConfig((current) => ({ ...current, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20 bg-black/40"
            />
            <span className="text-sm font-bold text-white">Enable automatic live sync</span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Live Match IDs</label>
              <textarea
                value={liveSyncConfig.matchId}
                onChange={(e) => setLiveSyncConfig((current) => ({ ...current, matchId: e.target.value }))}
                placeholder={"One match ID per line\n149699\n736f3e02-212a-49bc-8b3b-08a106312702"}
                rows={4}
                className="w-full resize-y bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base font-mono"
              />
              <p className="mt-1 text-[11px] text-gray-500">Use one match ID per line. Double-headers are supported when start times below are listed in the same order.</p>
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Match Start Times</label>
              <textarea
                value={liveSyncConfig.matchStartAt}
                onChange={(e) => setLiveSyncConfig((current) => ({ ...current, matchStartAt: e.target.value }))}
                placeholder={"One ISO local datetime per line\n2026-04-04T14:00\n2026-04-04T10:00"}
                rows={4}
                className="w-full resize-y bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base font-mono"
              />
              <p className="mt-1 text-[11px] text-gray-500">Match start times must line up with the IDs above, one per line. IPL double-headers usually have afternoon and evening starts.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Delay After Start</label>
              <input
                type="number"
                min="0"
                value={liveSyncConfig.afterOverMinutes}
                onChange={(e) => setLiveSyncConfig((current) => ({ ...current, afterOverMinutes: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base font-mono"
              />
              <p className="mt-1 text-[11px] text-gray-500">First sync checkpoint in minutes after match start. Default is 60 minutes, roughly 10 overs.</p>
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Retry Interval (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={liveSyncConfig.intervalMs}
                onChange={(e) => setLiveSyncConfig((current) => ({ ...current, intervalMs: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            {lastLiveDetectionAt
              ? `Live match detection only checks on page load or when you press refresh. Last checked: ${new Date(lastLiveDetectionAt).toLocaleTimeString()}`
              : 'Live match detection only checks on page load or when you press refresh.'}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {detectedMatchSlots.map((match, index) => {
              const hasMatch = Boolean(match?.id);
              const isFinished = String(match?.status || "").toLowerCase().includes("finish");
              const isEarlyMatch = Number(match?.overs || 0) < 10 && !isFinished;

              return (
                <div
                  key={`detected-slot-${index}`}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    hasMatch
                      ? isEarlyMatch
                        ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
                        : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                      : 'border-white/10 bg-black/20 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">
                      {index === 0 ? 'Detected IPL match' : 'Second slot'}
                    </p>
                    <div
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        hasMatch
                          ? isFinished
                            ? 'bg-indigo-500 text-white'
                            : 'bg-emerald-500 text-black animate-pulse'
                          : 'bg-slate-500/30 text-slate-200'
                      }`}
                    >
                      {hasMatch ? (match.status || 'Live') : 'Empty'}
                    </div>
                  </div>

                  {hasMatch ? (
                    <>
                      <p className="mt-1 font-mono text-xs opacity-80">{match.name || match.id}</p>
                      <p className="mt-1 text-xs opacity-70">
                        Match ID: {match.id} • Overs: {match.overs} • {match.provider ? String(match.provider).toUpperCase() : 'CricAPI'}
                      </p>
                      {(match.seriesName || match.matchType) && (
                        <p className="mt-1 text-xs opacity-70">
                          {match.seriesName || 'Unknown series'}{match.matchType ? ` • ${match.matchType}` : ''}
                        </p>
                      )}
                      {isEarlyMatch && (
                        <p className="mt-2 text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                          <RefreshCw size={12} className="animate-spin" /> Waiting for the first scheduled sync checkpoint after 10 overs.
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addDetectedMatchToConfig(match)}
                          className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950"
                        >
                          Add Detected Match
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      {index === 0
                        ? 'No live match detected yet.'
                        : 'No second match detected yet. This slot stays visible on single-match days.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {showLiveDebug && detectedMatchSlots[0] && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">API Debug Snapshot</p>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-cyan-100">
                {JSON.stringify({
                  provider: detectedMatchSlots[0].provider || null,
                  matchId: detectedMatchSlots[0].id || null,
                  seriesId: detectedMatchSlots[0].seriesId || null,
                  seriesName: detectedMatchSlots[0].seriesName || null,
                  matchType: detectedMatchSlots[0].matchType || null,
                  status: detectedMatchSlots[0].status || null,
                  overs: detectedMatchSlots[0].overs ?? null,
                  score: detectedMatchSlots[0].score || [],
                  debugPayload: detectedMatchSlots[0].debugPayload || null,
                }, null, 2)}
              </pre>
            </div>
          )}

          {detectionError && (
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
              <p className="font-bold flex items-center gap-2 tracking-widest uppercase text-[10px]">
                <AlertCircle size={14} /> Detection Engine Error
              </p>
              <p className="mt-1">{detectionError}</p>
            </div>
          )}

          {!detectedLiveMatch && !detectionError && (
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-400">
              No live IPL match was detected from the API right now.
            </div>
          )}

          <button
            type="submit"
            disabled={liveSyncSaving}
            className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {liveSyncSaving ? 'Saving...' : 'Save Auto Sync Settings'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="glass-card p-4 sm:p-6 h-auto xl:h-[70vh] flex flex-col">
          <h2 className="text-sm sm:text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="sm:w-5 sm:h-5 text-indigo-400" /> Select Any Player
          </h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search all players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 sm:pr-2 custom-scrollbar">
            {players.length === 0 && <p className="text-center text-gray-500 py-6 text-xs sm:text-sm">No players found</p>}
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all text-left ${
                  selectedPlayer?.id === player.id
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-lg'
                    : 'bg-black/20 border-white/5 hover:border-indigo-500/30 hover:bg-white/5'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=128&bold=true`} alt={player.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-white/10 shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm sm:text-base text-white truncate">{player.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-indigo-400 font-bold uppercase tracking-wider truncate">
                    {player.user?.name ? `Team: ${player.user.name}` : player.acquisition === 'External' ? 'External match record' : 'Unsold / no owner'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total</p>
                  <p className="text-sm font-black text-emerald-300">{getPlayerTotalPoints(player)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 sm:p-8">
            {selectedPlayer ? (
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4 sm:pb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.name)}&background=random&color=fff&size=256&bold=true`} alt={selectedPlayer.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/10 shadow-xl" />
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mb-0.5">{selectedPlayer.name}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">
                      {selectedPlayer.user?.name || (selectedPlayer.acquisition === 'External' ? 'External match record' : 'Unsold / no owner')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Current total: {getPlayerTotalPoints(selectedPlayer)} points</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 p-1 bg-black/20">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerMode('add');
                      setMatchNumber('');
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${playerMode === 'add' ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    Add Manual Adjustment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerMode('set')}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${playerMode === 'set' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    Edit Match Points
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Match Number</label>
                    <input
                      type="number"
                      value={matchNumber}
                      onChange={(e) => setMatchNumber(e.target.value)}
                      placeholder={playerMode === 'set' ? 'Required to edit existing score' : 'Disabled for manual adjustments'}
                      disabled={playerMode === 'add'}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm sm:text-base"
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      {playerMode === 'set'
                        ? 'Use this to edit the saved points for a specific match.'
                        : 'Manual adjustments are stored without a match number and should not be used for match scoring fixes.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">
                      {playerMode === 'set' ? 'Set Match Points' : 'Add Manual Adjustment'}
                    </label>
                    <div className="relative">
                      <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50" size={24} />
                      <input
                        required
                        type="number"
                        step="0.5"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                        placeholder={playerMode === 'set' ? 'e.g. 50' : 'e.g. 5 bonus points'}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black text-2xl sm:text-3xl"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 sm:py-5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-lg sm:text-xl shadow-2xl shadow-indigo-500/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? 'Processing...' : playerMode === 'set' ? <><PencilLine size={20} /> Save Player Edit</> : <><Plus size={20} /> Add Manual Adjustment</>}
                </button>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-bold text-gray-300 mb-3">Recorded Match Points & Calculations</h4>
                  <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                    {playerMatchHistory.length === 0 && <p className="text-xs text-gray-500">No recorded match points yet.</p>}
                    {playerMatchHistory.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white">{entry.matchId ? getPointEntryMatchLabel(entry, 'standard') : 'Manual Adjustment'}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
                              {entry.match?.displayId || entry.matchId || 'Manual'} • {entry.scoreVersion || 'legacy'} • tap to edit
                            </p>
                            <p className="mt-2 text-xs leading-6 text-gray-400">{getBreakdownSummary(entry)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-emerald-300">{entry.points} pts</p>
                            <button
                              type="button"
                              onClick={() => {
                                setPlayerMode('set');
                                setMatchNumber(entry.matchId || '');
                                setPoints(String(entry.points));
                              }}
                              className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-400/20"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                        <PointsBreakdownTable breakdownJson={entry.breakdownJson} />
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-center text-gray-500 p-8 sm:p-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                <Zap size={48} className="text-gray-600 opacity-20 mb-4 sm:w-16 sm:h-16" />
                <p className="text-lg sm:text-xl font-black text-white/20">Select any player</p>
                <p className="text-xs sm:text-sm text-gray-600">to inspect calculations or edit points</p>
              </div>
            )}
          </div>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <Users className="text-amber-400" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Edit Team Points</h2>
                <p className="text-sm text-gray-400">Adjust team bonus points and recalculate leaderboard totals.</p>
              </div>
            </div>

            <div className="space-y-3 mb-5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full rounded-xl border px-4 py-3 flex items-center justify-between transition-all text-left ${
                    selectedTeam?.id === team.id
                      ? 'bg-amber-500/15 border-amber-500/40'
                      : 'bg-black/20 border-white/5 hover:border-amber-500/25'
                  }`}
                >
                  <div>
                    <p className="font-bold text-white">{team.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Current bonus {team.bonusPoints || 0}</p>
                  </div>
                  <p className="text-lg font-black text-indigo-300">{team.totalPoints}</p>
                </button>
              ))}
            </div>

            {selectedTeam ? (
              <form onSubmit={handleTeamUpdate} className="space-y-4 border-t border-white/10 pt-5">
                <div>
                  <p className="text-sm font-bold text-white">{selectedTeam.name}</p>
                  <p className="text-xs text-gray-500">Leaderboard total will be recalculated from top 11 player points + bonus points.</p>
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Bonus Points</label>
                  <input
                    type="number"
                    step="0.5"
                    value={teamBonusPoints}
                    onChange={(e) => setTeamBonusPoints(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black text-2xl"
                  />
                </div>
                <button
                  type="submit"
                  disabled={teamLoading}
                  className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black py-4 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {teamLoading ? 'Updating...' : <><PencilLine size={20} /> Save Team Points</>}
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-500 border-t border-white/10 pt-5">Select a team to edit its bonus points.</p>
            )}
          </div>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <Trophy className="text-fuchsia-400" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Season-End Awards</h2>
                <p className="text-sm text-gray-400">Apply +500 to the franchise of the Orange Cap, Purple Cap, and Most Valuable Player winners.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-gray-300">
                This is a one-time season-close action. If `SEASON_FINAL_MATCH_ID` matches the synced final, these bonuses can also be applied automatically right after that final is imported.
              </div>
              <button
                type="button"
                onClick={applySeasonAwards}
                disabled={seasonAwardsLoading || seasonAwardsApplied}
                className="w-full rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-black py-4 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {seasonAwardsLoading ? 'Applying...' : seasonAwardsApplied ? 'Season Awards Already Applied' : 'Apply Season-End Award Bonuses'}
              </button>
            </div>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <Award className="text-emerald-400" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Partner IPL Team Win</h2>
                <p className="text-sm text-gray-400">Award +50 bonus points to all franchises linked to the winning IPL team.</p>
              </div>
            </div>
            <form onSubmit={awardPartnerWinBonus} className="space-y-4">
              <select
                value={winningIplTeam}
                onChange={(e) => setWinningIplTeam(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select winning IPL team</option>
                {IPL_TEAMS.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={teamLoading || !winningIplTeam}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {teamLoading ? 'Applying...' : 'Apply +50 Partner Bonus'}
              </button>
            </form>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <ScrollText className="text-indigo-400" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Audit Trail</h2>
                <p className="text-sm text-gray-400">Compact log of admin changes.</p>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {auditLogs.length === 0 && <p className="text-sm text-gray-500">No audit entries yet.</p>}
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-black/20 border border-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white truncate">{log.action}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 shrink-0">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 break-words">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
