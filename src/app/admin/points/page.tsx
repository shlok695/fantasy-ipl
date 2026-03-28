"use client";

import { useEffect, useMemo, useState } from 'react';
import { Shield, Plus, TrendingUp, Zap, RefreshCw, CheckCircle, AlertCircle, Search, Trophy, PencilLine, Users, ScrollText, Award } from 'lucide-react';
import { basePath } from '@/lib/basePath';

function getPlayerTotalPoints(player: any) {
  return (player?.points || []).reduce((sum: number, entry: any) => sum + (entry?.points || 0), 0);
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
  const IPL_TEAMS = ['CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RR', 'RCB', 'SRH'];
  const seasonAwardsApplied = auditLogs.some((log) => log.action === 'SEASON_AWARDS_APPLIED');

  const fetchSoldPlayers = async () => {
    try {
      const res = await fetch(`${basePath}/api/players?status=sold&q=${search}`, { cache: 'no-store' });
      const data = await res.json();
      setPlayers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${basePath}/api/teams`, { cache: 'no-store' });
      const data = await res.json();
      setTeams(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${basePath}/api/admin/audit`, { cache: 'no-store' });
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSoldPlayers();
  }, [search]);

  useEffect(() => {
    fetchTeams();
    fetchAuditLogs();
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

  const playerMatchHistory = useMemo(() => {
    if (!selectedPlayer) return [];
    return [...(selectedPlayer.points || [])].sort((a: any, b: any) => {
      const aNum = Number(a.matchId || 0);
      const bNum = Number(b.matchId || 0);
      return aNum - bNum;
    });
  }, [selectedPlayer]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !points) return;

    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          points: parseFloat(points),
          matchNumber: matchNumber ? parseInt(matchNumber) : null,
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
      await fetchSoldPlayers();
      await fetchTeams();
      await fetchAuditLogs();
    } catch (e) {
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
    } catch (e) {
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

      setSyncMessage({ type: 'success', text: data.message });
      setMatchIdSync('');
      await fetchSoldPlayers();
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
    } catch (e) {
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
    } catch (e) {
      alert('Failed to apply season awards');
    } finally {
      setSeasonAwardsLoading(false);
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

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="glass-card p-4 sm:p-6 h-auto xl:h-[70vh] flex flex-col">
          <h2 className="text-sm sm:text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="sm:w-5 sm:h-5 text-indigo-400" /> Select Sold Player
          </h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search sold players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 sm:pr-2 custom-scrollbar">
            {players.length === 0 && <p className="text-center text-gray-500 py-6 text-xs sm:text-sm">No sold players found</p>}
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
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=128&bold=true`} alt={player.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-white/10 shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm sm:text-base text-white truncate">{player.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-indigo-400 font-bold uppercase tracking-wider truncate">Team: {player.user?.name}</p>
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
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.name)}&background=random&color=fff&size=256&bold=true`} alt={selectedPlayer.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/10 shadow-xl" />
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mb-0.5">{selectedPlayer.name}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedPlayer.user?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Current total: {getPlayerTotalPoints(selectedPlayer)} points</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 p-1 bg-black/20">
                  <button type="button" onClick={() => setPlayerMode('add')} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${playerMode === 'add' ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    Add Match Points
                  </button>
                  <button type="button" onClick={() => setPlayerMode('set')} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${playerMode === 'set' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
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
                      placeholder={playerMode === 'set' ? 'Required to edit existing score' : 'Optional (e.g. 1)'}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">
                      {playerMode === 'set' ? 'Set Match Points' : 'Add Points'}
                    </label>
                    <div className="relative">
                      <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50" size={24} />
                      <input
                        required
                        type="number"
                        step="0.5"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                        placeholder="e.g. 50"
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
                  {loading ? 'Processing...' : playerMode === 'set' ? <><PencilLine size={20} /> Save Player Edit</> : <><Plus size={20} /> Add Player Points</>}
                </button>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-bold text-gray-300 mb-3">Recorded Match Points</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {playerMatchHistory.length === 0 && <p className="text-xs text-gray-500">No recorded match points yet.</p>}
                    {playerMatchHistory.map((entry: any) => (
                      <button
                        type="button"
                        key={entry.id}
                        onClick={() => {
                          setPlayerMode('set');
                          setMatchNumber(entry.matchId || '');
                          setPoints(String(entry.points));
                        }}
                        className="w-full bg-black/20 hover:bg-white/5 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-bold text-white">Match {entry.matchId || 'Manual'}</p>
                          <p className="text-[10px] uppercase tracking-widest text-gray-500">Tap to edit</p>
                        </div>
                        <p className="text-sm font-black text-emerald-300">{entry.points} pts</p>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-center text-gray-500 p-8 sm:p-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                <Zap size={48} className="text-gray-600 opacity-20 mb-4 sm:w-16 sm:h-16" />
                <p className="text-lg sm:text-xl font-black text-white/20">Select a sold player</p>
                <p className="text-xs sm:text-sm text-gray-600">to add or edit player points</p>
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
