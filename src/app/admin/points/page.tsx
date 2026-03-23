"use client";

import { useEffect, useState } from 'react';
import { Shield, Plus, TrendingUp, Zap, RefreshCw, CheckCircle, AlertCircle, Search, Trophy } from 'lucide-react';

export default function PointsAdmin() {
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [points, setPoints] = useState('');
  const [matchIdSync, setMatchIdSync] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [matchNumber, setMatchNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const fetchSoldPlayers = async () => {
    try {
      // Find all sold players
      const res = await fetch(`${basePath}/api/players?status=sold&q=${search}`);
      const data = await res.json();
      setPlayers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSoldPlayers();
  }, [search]);

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
          matchNumber: matchNumber ? parseInt(matchNumber) : null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
        return;
      }
      
      alert(`Added ${points} points to ${selectedPlayer.name}`);
      setPoints('');
      setSelectedPlayer(null);
    } catch (e) {
      alert("Failed to update points");
    } finally {
      setLoading(false);
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
      fetchSoldPlayers();
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 sm:px-0">
      
      <div className="flex justify-center flex-col items-center gap-3 sm:gap-4 border-b border-indigo-500/20 pb-6 sm:pb-8 pt-2 sm:pt-4">
        <div className="p-2.5 sm:p-4 bg-indigo-500/20 rounded-full text-indigo-400 mb-1 sm:mb-2">
          <Shield size={32} className="sm:w-12 sm:h-12" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white text-center">Admin Points Manager</h1>
        <p className="text-sm sm:text-base text-gray-400 text-center max-w-xl">Add match points to players and update team leaderboards automatically.</p>
      </div>

      {/* LIVE MATCH SYNC PANEL */}
      <div className="glass-card p-4 sm:p-6 mb-8 border border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* PLAYER SELECTION */}
        <div className="glass-card p-4 sm:p-6 h-auto md:h-[60vh] max-h-[50vh] md:max-h-none flex flex-col">
          <h2 className="text-sm sm:text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="sm:w-5 sm:h-5 text-indigo-400" /> Select Player
          </h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search Sold Players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 sm:pr-2 custom-scrollbar">
             {players.length === 0 && <p className="text-center text-gray-500 py-6 text-xs sm:text-sm">No sold players found</p>}
             {players.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all text-left ${
                  selectedPlayer?.id === p.id 
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-lg' 
                    : 'bg-black/20 border-white/5 hover:border-indigo-500/30 hover:bg-white/5'
                }`}
              >
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff&size=128&bold=true`} alt={p.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-white/10 shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm sm:text-base text-white truncate">{p.name} {p.country && <span className="text-[10px] sm:text-xs font-normal text-gray-500 sm:ml-1">({p.country})</span>}</p>
                  <p className="text-[9px] sm:text-[10px] text-indigo-400 font-bold uppercase tracking-wider truncate">Team: {p.user?.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* UPDATE FORM */}
        <div className="glass-card p-6 sm:p-8 flex flex-col justify-center">
          {selectedPlayer ? (
             <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4 sm:pb-6">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.name)}&background=random&color=fff&size=256&bold=true`} alt={selectedPlayer.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/10 shadow-xl" />
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mb-0.5">{selectedPlayer.name}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedPlayer.user?.name}</p>
                  </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Match Number</label>
                    <input
                      type="number"
                      value={matchNumber}
                      onChange={(e) => setMatchNumber(e.target.value)}
                      placeholder="Optional (e.g. 1)"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Points Scored</label>
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
                  {loading ? 'Processing...' : <><Plus size={20} /> Update Points</>}
                </button>
             </form>
          ) : (
            <div className="text-center text-gray-500 p-8 sm:p-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
               <Zap size={48} className="text-gray-600 opacity-20 mb-4 sm:w-16 sm:h-16" />
               <p className="text-lg sm:text-xl font-black text-white/20">Select a sold player</p>
               <p className="text-xs sm:text-sm text-gray-600">to add match points</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
