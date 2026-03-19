"use client";

import { useEffect, useState } from 'react';
import { Shield, Plus, TrendingUp, Zap, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

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

  const fetchSoldPlayers = async () => {
    try {
      // Find all sold players
      const res = await fetch(`/api/players?status=sold&q=${search}`);
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
      const res = await fetch('/api/points', {
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
      const res = await fetch('/api/sync-match', {
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
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex justify-center flex-col items-center gap-4 border-b border-indigo-500/20 pb-8 pt-4">
        <div className="p-4 bg-indigo-500/20 rounded-full text-indigo-400 mb-2">
          <Shield size={48} />
        </div>
        <h1 className="text-4xl font-black text-white text-center">Admin Points Manager</h1>
        <p className="text-gray-400 text-center">Add match points to players and update team leaderboards automatically.</p>
      </div>

      {/* LIVE MATCH SYNC PANEL */}
      <div className="glass-card p-6 mb-8 border border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400 animate-pulse">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Live API Match Sync</h2>
            <p className="text-sm text-gray-400">Trigger the Dream11 points engine strictly based on Cricket API live scorecard.</p>
          </div>
        </div>

        {syncMessage && (
          <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 ${syncMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {syncMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {syncMessage.text}
          </div>
        )}

        <form onSubmit={syncLiveMatch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1">Cricket API Match ID</label>
            <input 
              type="text" 
              value={matchIdSync}
              onChange={(e) => setMatchIdSync(e.target.value)}
              placeholder="e.g. 12345 or 'mock_test_1'"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            type="submit"
            disabled={syncLoading || !matchIdSync}
            className="bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {syncLoading ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
            {syncLoading ? 'Syncing...' : 'Calculate Points'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="glass-card p-6 h-[60vh] flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-indigo-400" /> Select Player
          </h2>
          <input
            type="text"
            placeholder="Search Sold Players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
             {players.length === 0 && <p className="text-center text-gray-500 py-4">No sold players match query</p>}
             {players.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                className={`p-3 rounded-lg flex items-center gap-4 cursor-pointer transition-all border ${
                  selectedPlayer?.id === p.id 
                    ? 'bg-indigo-600/30 border-indigo-500' 
                    : 'bg-black/20 border-white/5 hover:border-indigo-500/30 hover:bg-white/5'
                }`}
              >
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff&size=128&bold=true`} alt={p.name} className="w-12 h-12 rounded-full border border-white/10" />
                <div>
                  <p className="font-bold text-lg">{p.name} {p.country && <span className="text-sm font-normal text-gray-400">({p.country})</span>}</p>
                  <p className="text-xs text-gray-400">Team: {p.user?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-center">
          {selectedPlayer ? (
             <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex items-center gap-4">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.name)}&background=random&color=fff&size=256&bold=true`} alt={selectedPlayer.name} className="w-20 h-20 rounded-2xl border-2 border-white/10 shadow-lg" />
                  <div>
                    <h3 className="text-2xl font-black text-emerald-400 mb-1">{selectedPlayer.name}</h3>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{selectedPlayer.user?.name}</p>
                  </div>
                </div>
                
                <hr className="border-white/10" />

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Match Number (Optional)</label>
                  <input
                    type="number"
                    value={matchNumber}
                    onChange={(e) => setMatchNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Points Scored</label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-2xl"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-xl font-bold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : <><Plus /> Update Points</>}
                </button>
             </form>
          ) : (
            <div className="text-center text-gray-500 p-8">
               <p className="text-xl font-semibold">Select a sold player</p>
               <p className="text-sm">to add match points</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
