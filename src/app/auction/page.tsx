"use client";

import { useEffect, useState } from 'react';
import { Search, Gavel, UserCheck, UserX, Activity } from 'lucide-react';
import { getPlayerImage, getCountryFlag, getPlayerMeta, getFranchiseFlag } from '@/lib/playerIndex';

export default function AuctionRoom() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'passed'>('upcoming');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [dynamicMeta, setDynamicMeta] = useState<any>(null);

  useEffect(() => {
    if (selectedPlayer?.name) {
      setDynamicMeta(null);
      const localMeta = getPlayerMeta(selectedPlayer.name);
      if (localMeta.image && localMeta.team) {
         setDynamicMeta(localMeta);
         return;
      }
      
      fetch(`/api/player-info?name=${encodeURIComponent(selectedPlayer.name)}`)
        .then(res => res.json())
        .then(data => {
           setDynamicMeta({
             image: localMeta.image || data.image,
             team: localMeta.team || data.iplTeam
           });
        })
        .catch(() => setDynamicMeta(localMeta));
    }
  }, [selectedPlayer?.name]);
  
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveState, setLiveState] = useState<any>(null);
  const [queueCategory, setQueueCategory] = useState<string>('');

  const AUCTION_SETS_UI = [
    { label: 'Any (Auto-Detect)', value: '' },
    { label: 'Capped Batters', value: 'Capped|Batter' },
    { label: 'Capped All-rounders', value: 'Capped|All-rounder' },
    { label: 'Capped Wicketkeepers', value: 'Capped|Wicketkeeper' },
    { label: 'Capped Bowlers', value: 'Capped|Bowler' },
    { label: 'Uncapped Batters', value: 'Uncapped|Batter' },
    { label: 'Uncapped All-rounders', value: 'Uncapped|All-rounder' },
    { label: 'Uncapped Wicketkeepers', value: 'Uncapped|Wicketkeeper' },
    { label: 'Uncapped Bowlers', value: 'Uncapped|Bowler' },
    { label: 'Overseas Batters', value: 'Overseas|Batter' },
    { label: 'Overseas All-rounders', value: 'Overseas|All-rounder' },
    { label: 'Overseas Wicketkeepers', value: 'Overseas|Wicketkeeper' },
    { label: 'Overseas Bowlers', value: 'Overseas|Bowler' },
  ];

  // Sync Live Stage every 1.5 seconds
  useEffect(() => {
    const snapLive = async () => {
      try {
        const res = await fetch('/api/auction/live');
        const data = await res.json();
        if (data.state) setLiveState(data.state);
      } catch(e) {}
    };
    snapLive();
    const iv = setInterval(snapLive, 1500);
    return () => clearInterval(iv);
  }, []);

  // Only auto-snap the Admin's view when the LIVE player actually changes
  useEffect(() => {
    if (liveState?.player) {
      setSelectedPlayer(liveState.player);
    }
  }, [liveState?.player?.id]);

  const fetchPlayersList = async () => {
    try {
      const res = await fetch(`/api/players?status=${activeTab}&q=${searchTerm}`);
      const data = await res.json();
      setPlayers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPlayersList();
  }, [searchTerm, activeTab]);

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
      fetchPlayersList();
      fetchTeams(); // refresh budgets
    } catch (e) {
      alert("Failed to assign player");
    } finally {
      setLoading(false);
    }
  };

  const handleControl = async (actionStr: string) => {
    setLoading(true);
    try {
      let explicitCat = undefined;
      if (actionStr === "START_AUTO_QUEUE" && queueCategory) {
        const [t, r] = queueCategory.split('|');
        explicitCat = { type: t, role: r };
      }

      const res = await fetch('/api/auction/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionStr,
          playerId: selectedPlayer?.id,
          basePrice: selectedPlayer ? parseFloat(selectedPlayer.basePrice?.replace(/[^0-9.]/g, '') || "2.0") : 0,
          category: explicitCat
        })
      });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else {
        alert(actionStr === "START" ? "Player pushed to Live Stage! Open /auction/live to watch." : "Action Successful!");
        if (actionStr === "SELL" || actionStr === "UNSOLD") {
           setSelectedPlayer(null);
           fetchPlayersList();
           fetchTeams();
        }
      }
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
              placeholder={`Search ${activeTab === 'upcoming' ? 'Upcoming' : 'Passed'} Players...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* TABS */}
          <div className="flex bg-black/40 p-1 rounded-xl mb-4 border border-white/5">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Upcoming ({activeTab === 'upcoming' ? players.length : '...'})
            </button>
            <button
              onClick={() => setActiveTab('passed')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'passed' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Passed ({activeTab === 'passed' ? players.length : '...'})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
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
                  <div className="relative">
                    <img src={getPlayerImage(p.name, p.role)} alt={p.name} className="w-10 h-10 rounded-full border border-white/10 shadow-lg object-cover bg-black" />
                    {getCountryFlag(p.country) && (
                      <img src={getCountryFlag(p.country)!} alt={p.country || "India"} className="absolute -bottom-1 -right-1 w-4 h-3 object-cover rounded shadow" />
                    )}
                  </div>
                  <p className="font-bold text-lg">{p.name} {p.country && <span className="text-sm font-normal text-gray-400">({p.country})</span>}</p>
                </div>
                <p className="text-xs bg-white/10 px-2 py-1 rounded">{p.role}</p>
              </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{p.type}</span>
                  <span>Base: {p.basePrice?.replace(/\?/g, '₹') || '-'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t border-white/10">
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-amber-500 flex items-center gap-2 text-sm uppercase tracking-widest"><Activity size={16}/> Auto-Queue Dispatch</h3>
              <button 
                onClick={() => handleControl('START_TEAM_QUEUE')}
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black rounded-lg shadow-lg shadow-orange-500/20 transition-all mb-1"
              >
                1. Auction IPL Teams (Start)
              </button>
              <div className="flex items-stretch gap-2 relative">
                <select 
                  value={queueCategory}
                  onChange={(e) => setQueueCategory(e.target.value)}
                  className="w-full max-w-[60%] bg-black/40 border border-amber-500/30 rounded-lg px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-400 truncate"
                >
                  {AUCTION_SETS_UI.map(s => <option key={s.label} value={s.value} className="bg-gray-900 text-white font-medium">{s.label}</option>)}
                </select>
                <button 
                  onClick={() => handleControl('START_AUTO_QUEUE')}
                  disabled={loading}
                  className="flex-1 py-0 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white text-sm font-black rounded-lg shadow-lg shadow-indigo-500/20 transition-all whitespace-nowrap"
                >
                  2. Automated Live
                </button>
              </div>
            </div>
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
                <div className="relative">
                  <img src={dynamicMeta?.image || getPlayerImage(selectedPlayer.name, selectedPlayer.role)} alt={selectedPlayer.name} className="w-32 h-32 rounded-3xl border-4 border-white/10 shadow-2xl hover:scale-105 transition-transform object-cover bg-black" />
                  {getCountryFlag(selectedPlayer.country) && (
                    <img src={getCountryFlag(selectedPlayer.country)!} alt={selectedPlayer.country || "India"} className="absolute -bottom-3 -right-3 w-10 h-7 object-cover rounded-md shadow-lg border border-white/20 z-20" />
                  )}
                  {dynamicMeta?.team && (
                    <img src={getFranchiseFlag(dynamicMeta.team)} alt={dynamicMeta.team} className="absolute -top-3 -left-3 w-12 h-12 object-cover rounded-full shadow-xl border-2 border-white/20 z-20 bg-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-black mb-2">{selectedPlayer.name} {selectedPlayer.country && <span className="text-2xl font-normal text-gray-400">({selectedPlayer.country})</span>}</h2>
                  <div className="flex gap-3 flex-wrap">
                    <span className="bg-indigo-500/20 text-indigo-300 font-semibold px-3 py-1 rounded-full text-sm border border-indigo-500/30">
                      {selectedPlayer.role}
                    </span>
                    <span className="bg-rose-500/20 text-rose-300 font-semibold px-3 py-1 rounded-full text-sm border border-rose-500/30">
                      {selectedPlayer.type}
                    </span>
                    {dynamicMeta?.team && (
                      <span className="bg-white/10 text-white font-bold px-3 py-1 rounded-full text-sm border border-white/20 flex items-center gap-1.5">
                        <img src={getFranchiseFlag(dynamicMeta.team)} alt={dynamicMeta.team} className="w-4 h-4 rounded-full object-cover bg-white" />
                        {dynamicMeta.team}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wider">Base Price</p>
                  <p className="font-mono text-2xl text-emerald-400">{selectedPlayer.basePrice?.replace(/\?/g, '₹') || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                {/* LIVE ROOM CONTROLS */}
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleControl('START_AUTO_QUEUE')}
                      disabled={loading}
                      className="flex-1 py-3 font-bold rounded-xl text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                    >
                      Automated Live
                    </button>
                    <button 
                       onClick={() => handleControl('RESET_BID')}
                       disabled={loading}
                       className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all"
                    >
                       Reset Bid
                    </button>
                  </div>

                  <button
                    onClick={() => handleControl('START')}
                    disabled={loading}
                    className="w-full py-3 font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
                  >
                    1. Force Inject into Live Stage
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleControl('SELL')}
                      disabled={loading}
                      className="flex-1 py-3 font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 transition-all disabled:opacity-50"
                    >
                      2. Sell Highest
                    </button>
                    <button
                      onClick={() => handleControl('UNSOLD')}
                      disabled={loading || !!liveState?.highestBidderId}
                      className="flex-1 py-3 font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-500 transition-all disabled:opacity-50"
                    >
                      3. Unsold
                    </button>
                  </div>
                </div>

                {/* MANUAL OVERRIDE */}
                <form onSubmit={handleSell} className="bg-black/30 border border-white/5 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-gray-400 mb-2 flex items-center gap-2"><Gavel size={18}/> Manual Override</h3>
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
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Winning Bid (e.g. 5.5)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 font-bold rounded-xl text-white bg-white/10 hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    Assign Manually
                  </button>
                </form>
              </div>
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
