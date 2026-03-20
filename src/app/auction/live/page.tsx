"use client";

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Gavel, Clock, Trophy, AlertTriangle, Zap, UserX, Activity } from 'lucide-react';
import { getPlayerImage, getCountryFlag, getPlayerMeta, getFranchiseFlag } from '@/lib/playerIndex';

export default function LiveAuctionRoom() {
  const { data: session } = useSession();
  const [liveState, setLiveState] = useState<any>(null);
  const [customBid, setCustomBid] = useState<string>('');
  const [isBidding, setIsBidding] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [hasPassedId, setHasPassedId] = useState<string>('');
  const [dynamicMeta, setDynamicMeta] = useState<any>(null);

  const player = liveState?.player;

  useEffect(() => {
    if (player?.name) {
      setDynamicMeta(null);
      const localMeta = getPlayerMeta(player.name);
      if (localMeta.image && localMeta.age && localMeta.team) {
         setDynamicMeta(localMeta);
         return;
      }
      
      fetch(`/api/player-info?name=${encodeURIComponent(player.name)}`)
        .then(res => res.json())
        .then(data => {
           setDynamicMeta({
             image: localMeta.image || data.image,
             age: localMeta.age || data.age,
             team: localMeta.team || data.iplTeam
           });
        })
        .catch(() => setDynamicMeta(localMeta));
    }
  }, [player?.name]);

  const fetchLiveState = async () => {
    try {
      const res = await fetch('/api/auction/live');
      const data = await res.json();
      if (data.state) {
        setLiveState(data.state);
      }
    } catch (e) {
      console.error("Live sync failed", e);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      setTeams(await res.json());
    } catch(e) {}
  };

  useEffect(() => {
    fetchLiveState();
    fetchTeams();
    const intervalLive = setInterval(fetchLiveState, 1000);
    const intervalTeams = setInterval(fetchTeams, 3000);
    return () => { clearInterval(intervalLive); clearInterval(intervalTeams); };
  }, []);

  const placeBid = async (amount: number) => {
    if (!session?.user) return alert("You must be logged in to bid!");
    setIsBidding(true);
    try {
      const res = await fetch('/api/auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Bid failed");
      } else {
        setCustomBid('');
        await fetchLiveState(); // instantly reflect
      }
    } catch (e) {
      alert("Network Error");
    } finally {
      setIsBidding(false);
    }
  };

  if (!liveState) {
    return (
      <div className="flex justify-center flex-col items-center h-[70vh] gap-4">
        <Activity className="animate-pulse text-indigo-500" size={64} />
        <h2 className="text-xl text-gray-400 font-bold tracking-widest uppercase">Connecting to Live Server...</h2>
      </div>
    );
  }

  const markReady = async () => {
    if (!session?.user) return;
    try {
      await fetch('/api/auction/ready', { method: 'POST' });
      await fetchLiveState();
    } catch (e) { console.error(e); }
  };

  const isAuctionActive = player && liveState.status === "BIDDING";
  const isAuctionEnded = player && liveState.status === "SUMMARY";
  const readyTeamsArr = liveState.readyTeams ? liveState.readyTeams.split(',') : [];
  const hasReadied = (session?.user as any)?.id && readyTeamsArr.includes((session?.user as any)?.id);

  // Default increments
  const currentHighest = liveState.highestBid || 0;
  const minimumNextBid = currentHighest === 0 ? parseFloat(player?.basePrice?.replace(/[^0-9.]/g, '') || "2.0") : currentHighest + 0.2;

  const handleCustomBid = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customBid);
    if (!isNaN(val) && val >= minimumNextBid) {
      placeBid(val);
    } else {
      alert(`Bid must be at least ₹${minimumNextBid.toFixed(2)} Cr`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pt-8 px-4">

      {/* HEADER ROOM */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400 relative">
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <Gavel size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Live Block</h1>
            <p className="text-gray-400">Real-time synchronized multiplayer bidding.</p>
          </div>
        </div>

        {session?.user && (
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Your Franchise</p>
            <p className="text-xl font-black text-indigo-400">{session.user.name}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* MAIN STAGE (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          {!player ? (
            <div className="glass-card h-[50vh] flex flex-col items-center justify-center text-gray-500 p-8 border-dashed border-2 border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black opacity-50"></div>
              <UserX size={80} className="mb-6 opacity-30 relative z-10" />
              <h2 className="text-3xl font-black text-white/50 mb-2 relative z-10">Waiting for Auctioneer...</h2>
              <p className="text-lg text-gray-400 relative z-10">The admin hasn't pushed the next player to the stage yet.</p>
            </div>
          ) : (
            <div className={`glass-card p-0 overflow-hidden relative transition-all duration-700 ${isAuctionEnded ? (liveState.highestBidderId ? 'border-amber-500 shadow-[0_0_50px_-12px_rgba(245,158,11,0.5)]' : 'border-gray-500 shadow-[0_0_50px_-12px_rgba(107,114,128,0.5)]') : 'border-indigo-500/30'}`}>


          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

              {/* PLAYER INFO */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  {isAuctionEnded && liveState.highestBidderId && (
                    <div className="absolute -top-4 -right-4 p-3 bg-amber-500 text-white rounded-full z-20 shadow-xl rotate-12 animate-bounce">
                      <Trophy size={32} />
                    </div>
                  )}
                  <img
                    src={dynamicMeta?.image || getPlayerImage(player.name)}
                    alt={player.name}
                    className="w-48 h-48 rounded-3xl border-4 border-white/10 shadow-2xl relative z-10 object-cover bg-black"
                  />
                  {getCountryFlag(player.country) && (
                    <img src={getCountryFlag(player.country)!} alt={player.country || "India"} className="absolute -bottom-4 -right-2 w-16 h-11 object-cover rounded-md shadow-xl border-2 border-white/20 z-20" />
                  )}
                  {dynamicMeta?.team && (
                    <img src={getFranchiseFlag(dynamicMeta.team)} alt={dynamicMeta.team} className="absolute -top-4 -left-4 w-16 h-16 object-cover rounded-full shadow-2xl border-4 border-white/20 z-20 bg-white" />
                  )}
                  <div className="absolute inset-0 bg-indigo-500 blur-[100px] opacity-20 -z-10"></div>
                </div>

                <div>
                  <h2 className="text-4xl font-black mb-2">{player.name}</h2>
                  <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
                    <span className="bg-white/5 px-3 py-1 rounded text-sm text-gray-300">
                      {player.country && player.country.trim() !== "" ? player.country : 'Indian'}
                    </span>
                    <span className="bg-indigo-500/20 text-indigo-300 font-semibold px-3 py-1 rounded-full text-sm border border-indigo-500/30">
                      {player.role}
                    </span>
                    {dynamicMeta?.age && (
                      <span className="bg-amber-500/20 text-amber-300 font-semibold px-3 py-1 rounded-full text-sm border border-amber-500/30">
                        Age: {dynamicMeta.age}
                      </span>
                    )}
                    {dynamicMeta?.team && (
                      <span className="bg-white/10 text-white font-bold px-3 py-1 rounded-full text-sm border border-white/20 flex items-center gap-1.5">
                        <img src={getFranchiseFlag(dynamicMeta.team)} alt={dynamicMeta.team} className="w-4 h-4 rounded-full object-cover bg-white" />
                        {dynamicMeta.team}
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-gray-400 mt-4">Base Price: <span className="text-emerald-400 font-mono font-bold">₹{player.basePrice?.replace(/[^0-9.]/g, '') || "2.0"} Cr</span></p>
                </div>
              </div>

              {/* BIDDING INFO */}
              <div className="space-y-8 flex flex-col justify-center">

                {/* CURRENT HIGHEST */}
                <div className="bg-black/40 rounded-3xl p-6 border border-white/5 relative overflow-hidden text-center">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Current Highest Bid</p>
                  <p className="text-7xl font-black text-emerald-400 font-mono tracking-tighter mb-4 shadow-emerald-500 inline-block drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    ₹{currentHighest.toFixed(2)} <span className="text-2xl text-emerald-600">Cr</span>
                  </p>
                  <div className="flex justify-center items-center gap-3">
                    <span className="text-gray-500 text-sm">Winning Franchise:</span>
                    {liveState.highestBidder ? (
                       <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/30 shadow-inner">
                         <img src={getFranchiseFlag(liveState.highestBidder.name)} className="w-8 h-8 rounded-full border border-indigo-500/50 object-cover bg-white" alt="Franchise" />
                         <span className="font-bold text-xl text-white">{liveState.highestBidder.name}</span>
                       </div>
                    ) : (
                       <span className="font-bold text-xl text-gray-600 italic">No Bids Yet</span>
                    )}
                  </div>
                </div>

                {/* SUMMARY OR BIDDING CONTROLS */}
                {isAuctionEnded ? (
                  <div className={`p-6 rounded-3xl text-center border ${liveState.highestBidderId ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
                    <h3 className={`text-3xl font-black mb-2 ${liveState.highestBidderId ? 'text-amber-500' : 'text-gray-400'}`}>
                      {liveState.highestBidderId ? 'SOLD!' : 'UNSOLD'}
                    </h3>
                    
                    {session?.user?.name !== 'admin' && (
                      <div className="mt-6">
                        {hasReadied ? (
                           <div className="py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold animate-pulse">
                             Waiting for other franchises... ({readyTeamsArr.length})
                           </div>
                        ) : (
                           <button 
                             onClick={markReady}
                             className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xl shadow-lg shadow-emerald-500/25 transition-all outline-none"
                           >
                             READY FOR NEXT ROUND ✅
                           </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-3 relative">
                      {hasPassedId === player.id && (
                        <div className="absolute inset-0 -inset-x-2 -inset-y-4 bg-black/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-2xl border border-white/10">
                          <p className="text-gray-400 font-bold uppercase tracking-widest bg-black/50 px-6 py-2 rounded-full border border-gray-500/30 shadow-2xl">You Folded on this Player</p>
                        </div>
                      )}

                      <button
                        onClick={() => placeBid(minimumNextBid)}
                        disabled={isBidding || !session}
                        className="col-span-3 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-2xl rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                      >
                        ⚡ BID ₹{minimumNextBid.toFixed(2)} Cr
                      </button>

                      <button onClick={() => placeBid(currentHighest + 0.5)} disabled={isBidding || !session} className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-gray-300 transition-colors border border-white/5">
                        +₹0.5 Cr
                      </button>
                      <button onClick={() => placeBid(currentHighest + 1.0)} disabled={isBidding || !session} className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-gray-300 transition-colors border border-white/5">
                        +₹1.0 Cr
                      </button>
                      <button onClick={() => placeBid(currentHighest + 2.0)} disabled={isBidding || !session} className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-gray-300 transition-colors border border-white/5">
                        +₹2.0 Cr
                      </button>
                    </div>

                    <form onSubmit={handleCustomBid} className="flex gap-3">
                      <input
                        type="number" step="0.1" min={minimumNextBid}
                        value={customBid} onChange={(e) => setCustomBid(e.target.value)}
                        placeholder={`Min: ${minimumNextBid.toFixed(2)}`}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-lg"
                      />
                      <button type="submit" disabled={isBidding || !session} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50">
                        Custom
                      </button>
                    </form>

                    {session?.user?.name !== 'admin' && hasPassedId !== player.id && (
                      <button 
                        onClick={() => setHasPassedId(player.id)}
                        className="w-full py-4 text-gray-500 hover:text-gray-300 font-bold uppercase tracking-widest text-sm bg-white/5 hover:bg-white/10 rounded-2xl transition-all outline-none"
                      >
                        Fold / Sit Out
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
        </div>

        {/* SIDEBAR STANDINGS (col-span-1) */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-400 uppercase tracking-widest text-sm flex items-center gap-2">
            <Trophy size={16} /> Live Standings
          </h2>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            {teams.length === 0 ? <p className="text-gray-500 italic text-sm">No active franchises</p> : null}
            {teams.map(team => (
               <div key={team.id} className="bg-black/30 border border-white/10 rounded-xl p-4">
                 <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2 min-w-0">
                     <img src={getFranchiseFlag(team.name)} className="w-6 h-6 rounded-full shrink-0 object-cover bg-white" alt="Team" />
                     <h3 className="font-bold text-indigo-400 truncate pr-2">{team.name}</h3>
                   </div>
                   <span className="font-mono text-emerald-400 font-bold shrink-0 ml-2">₹{team.budget.toFixed(1)}</span>
                 </div>
                 {team.players && team.players.length > 0 ? (
                   <details className="group">
                     <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 list-none flex items-center gap-1 font-bold">
                       View Squad ({team.players.length})
                     </summary>
                     <div className="mt-3 space-y-2">
                       {team.players.map((p: any) => (
                         <div key={p.id} className="flex justify-between text-xs text-gray-400 bg-white/5 px-2 py-1.5 rounded">
                           <span className="truncate pr-2">{p.name} <span className="opacity-50">({p.role.substring(0,3)})</span></span>
                           <span className="text-emerald-500">₹{p.auctionPrice}</span>
                         </div>
                       ))}
                     </div>
                   </details>
                 ) : (
                   <p className="text-xs text-gray-600 italic mt-1">No players bought</p>
                 )}
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
