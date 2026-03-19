"use client";

import { useEffect, useState } from 'react';
import { Search, Gavel, UserCheck, UserX } from 'lucide-react';

export default function AuctionRoom() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUnsold = async () => {
    try {
      const res = await fetch(`/api/players?status=unsold&q=${search}`);
      const data = await res.json();
      setPlayers(data);
    } catch (e) { console.error(e); }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchUnsold();
  }, [search]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !selectedTeamId || !bidAmount) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          teamId: selectedTeamId,
          amount: parseFloat(bidAmount)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
        return;
      }

      setSelectedPlayer(null);
      setBidAmount('');
      setSelectedTeamId('');
      fetchUnsold();
      fetchTeams(); // refresh budgets
    } catch (e) {
      alert("Failed to assign player");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-4 border-b border-indigo-500/20 pb-4">
        <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
          <Gavel size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Auction Room</h1>
          <p className="text-gray-400">Assign unsold players to family teams.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PLAYER LIST */}
        <div className="lg:col-span-1 glass-card p-4 h-[70vh] flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search Unsold Players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {players.length === 0 && <p className="text-center text-gray-500 p-4">No players found</p>}
            {players.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedPlayer?.id === p.id 
                    ? 'bg-indigo-600/30 border-indigo-500' 
                    : 'bg-black/20 border-white/5 hover:border-indigo-500/30 hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff&size=128&bold=true`} alt={p.name} className="w-10 h-10 rounded-full border border-white/10 shadow-lg" />
                  <p className="font-bold text-lg">{p.name} {p.country && <span className="text-sm font-normal text-gray-400">({p.country})</span>}</p>
                </div>
                <p className="text-xs bg-white/10 px-2 py-1 rounded">{p.role}</p>
              </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{p.type}</span>
                  <span>Base: {p.basePrice || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AUCTION PANEL */}
        <div className="lg:col-span-2">
          {selectedPlayer ? (
            <div className="glass-card p-8 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <UserCheck size={200} />
              </div>

              <div className="flex items-center gap-6">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.name)}&background=random&color=fff&size=512&bold=true`} alt={selectedPlayer.name} className="w-32 h-32 rounded-3xl border-4 border-white/10 shadow-2xl hover:scale-105 transition-transform" />
                <div>
                  <h2 className="text-4xl font-black mb-2">{selectedPlayer.name} {selectedPlayer.country && <span className="text-2xl font-normal text-gray-400">({selectedPlayer.country})</span>}</h2>
                  <div className="flex gap-3">
                    <span className="bg-indigo-500/20 text-indigo-300 font-semibold px-3 py-1 rounded-full text-sm border border-indigo-500/30">
                      {selectedPlayer.role}
                    </span>
                    <span className="bg-rose-500/20 text-rose-300 font-semibold px-3 py-1 rounded-full text-sm border border-rose-500/30">
                      {selectedPlayer.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wider">Base Price</p>
                  <p className="font-mono text-2xl text-emerald-400">{selectedPlayer.basePrice || '-'}</p>
                </div>
              </div>

              <form onSubmit={handleSell} className="space-y-6 pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Winning Team</label>
                    <select
                      required
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium appearance-none"
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (₹{t.budget.toFixed(1)} Cr)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Winning Bid (Cr)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="e.g. 5.5"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xl"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-xl font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : <><Gavel /> Sold!</>}
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-card h-full flex flex-col items-center justify-center text-gray-500 p-8 border-dashed border-2 border-white/10">
              <UserX size={64} className="mb-4 opacity-50" />
              <p className="text-xl font-semibold">Select a player from the list</p>
              <p className="text-sm">to start the auction</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
