"use client";

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Gavel, Clock, Trophy, AlertTriangle, Zap, UserX, Activity, UserCheck, LayoutDashboard } from 'lucide-react';
import { getPlayerImage, getCountryFlag, getPlayerMeta, getFranchiseFlag } from '@/lib/playerIndex';
import { basePath } from '@/lib/basePath';

export default function LiveAuctionRoom() {
  const { data: session } = useSession();
  const [liveState, setLiveState] = useState<any>(null);
  const [liveRoomHidden, setLiveRoomHidden] = useState(false);
  const [customBid, setCustomBid] = useState<string>('');
  const [isBidding, setIsBidding] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [hasPassedId, setHasPassedId] = useState<string>('');
  const [dynamicMeta, setDynamicMeta] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const player = liveState?.player;

  useEffect(() => {
    if (player?.name) {
      setDynamicMeta(null);
      const localMeta = getPlayerMeta(player.name);
      if (localMeta.image && localMeta.team) {
         setDynamicMeta(localMeta);
         return;
      }
      
      fetch(`${basePath}/api/player-info?name=${encodeURIComponent(player.name)}`)
        .then(res => res.json())
        .then(data => {
           setDynamicMeta({
             image: localMeta.image || data.image,
             team: localMeta.team || data.iplTeam
           });
        })
        .catch(() => setDynamicMeta(localMeta));
    }
  }, [player?.name]);

  const fetchLiveState = async () => {
    try {
      const res = await fetch(`${basePath}/api/auction/live`);
      if (res.status === 403) {
        setLiveRoomHidden(true);
        return;
      }
      const data = await res.json();
      if (data.state) {
        setLiveRoomHidden(false);
        setLiveState(data.state);
      }
    } catch (e) {
      console.error("Live sync failed", e);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${basePath}/api/teams`);
      setTeams(await res.json());
    } catch(e) {}
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${basePath}/api/auction/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchLiveState();
    fetchTeams();
    fetchStats();
    const intervalLive = setInterval(fetchLiveState, 1000);
    const intervalTeams = setInterval(fetchTeams, 3000);
    const intervalStats = setInterval(fetchStats, 5000);
    return () => { 
      clearInterval(intervalLive); 
      clearInterval(intervalTeams); 
      clearInterval(intervalStats);
    };
  }, []);

  useEffect(() => {
    if (liveState?.status === "SUMMARY" && liveState.updatedAt) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - new Date(liveState.updatedAt).getTime();
        const remaining = Math.max(0, 12 - Math.floor(elapsed / 1000));
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [liveState?.status, liveState?.updatedAt]);

  const placeBid = async (amount: number) => {
    if (!session?.user) return alert("You must be logged in to bid!");
    setIsBidding(true);
    try {
      const res = await fetch(`${basePath}/api/auction/bid`, {
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

  if (liveRoomHidden) {
    return (
      <div className="glass-card p-8 sm:p-10 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-3">Live Room Hidden</h1>
        <p className="text-gray-400">The admin has hidden the live room for now. It will reappear when the admin opens it for the league.</p>
      </div>
    );
  }

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
      await fetch(`${basePath}/api/auction/ready`, { method: 'POST' });
      await fetchLiveState();
    } catch (e) { console.error(e); }
  };

  const isAuctionActive = player && liveState.status === "BIDDING";
  const isAuctionEnded = player && liveState.status === "SUMMARY";
  const readyTeamsArr = liveState.readyTeams ? liveState.readyTeams.split(',') : [];
  const hasReadied = (session?.user as any)?.id && readyTeamsArr.includes((session?.user as any)?.id);

  const myTeam = teams.find(t => t.id === (session?.user as any)?.id);
  const canRTM = isAuctionActive && 
                 myTeam && 
                 !myTeam.rtmUsed && 
                 player?.iplTeam === myTeam.iplTeam && 
                 liveState.highestBidderId && 
                 liveState.highestBidderId !== myTeam.id;

  const handleRTM = async () => {
    try {
      const res = await fetch(`${basePath}/api/auction/rtm`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) alert(data.error);
    } catch (e) { alert("RTM Failed"); }
  };

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
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pt-4 sm:pt-8 px-4">

      {/* HEADER ROOM */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-rose-500/20 rounded-xl text-rose-400 relative">
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-rose-500"></span>
            </span>
            <Gavel size={24} className="sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white">Live Room</h1>
            <p className="text-xs sm:text-sm text-gray-400">Real-time synchronized multiplayer bidding.</p>
          </div>
        </div>

        {session?.user && (
          <div className="text-center sm:text-right w-full sm:w-auto bg-black/20 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-white/5 sm:border-0">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-bold">Your Franchise</p>
            <p className="text-lg sm:text-xl font-black text-indigo-400 truncate">{session.user.name}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        
        {/* MAIN STAGE (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          {!player ? (
            <div className="space-y-6">
              {/* DASHBOARD SUMMARY */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-in slide-in-from-top duration-700">
                  <div className="glass-card p-4 sm:p-6 border-indigo-500/20 bg-indigo-500/5">
                    <p className="text-[10px] sm:text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-2xl sm:text-4xl font-black text-white">{stats.totalRemaining}</p>
                  </div>
                  <div className="glass-card p-4 sm:p-6 border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] sm:text-xs font-bold text-emerald-300 uppercase tracking-widest mb-1">Batters</p>
                    <p className="text-2xl sm:text-4xl font-black text-white">{stats.roles.Batter}</p>
                  </div>
                  <div className="glass-card p-4 sm:p-6 border-blue-500/20 bg-blue-500/5">
                    <p className="text-[10px] sm:text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">Bowlers</p>
                    <p className="text-2xl sm:text-4xl font-black text-white">{stats.roles.Bowler}</p>
                  </div>
                  <div className="glass-card p-4 sm:p-6 border-amber-500/20 bg-amber-500/5">
                    <p className="text-[10px] sm:text-xs font-bold text-amber-300 uppercase tracking-widest mb-1">All-Rounders</p>
                    <p className="text-2xl sm:text-4xl font-black text-white">{stats.roles['All-Rounder']}</p>
                  </div>
                  <div className="glass-card p-4 sm:p-6 border-rose-500/20 bg-rose-500/5">
                    <p className="text-[10px] sm:text-xs font-bold text-rose-300 uppercase tracking-widest mb-1">Wicketkeepers</p>
                    <p className="text-2xl sm:text-4xl font-black text-white">{stats.roles.Wicketkeeper}</p>
                  </div>
                </div>
              )}

              <div className="glass-card py-10 flex flex-col items-center justify-center text-gray-500 p-6 border-dashed border-2 border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-black to-black opacity-50"></div>
                <UserX size={60} className="sm:w-20 sm:h-20 mb-4 sm:mb-6 opacity-30 relative z-10" />
                <h2 className="text-xl sm:text-3xl font-black text-white/50 mb-2 relative z-10 text-center">Waiting for Auctioneer...</h2>
                <p className="text-sm sm:text-lg text-gray-400 relative z-10 mb-6 sm:mb-8 text-center max-w-sm">The admin hasn't pushed the next player to the stage yet.</p>
                
                {session?.user?.name === 'admin' && (
                  <button 
                    onClick={async () => {
                      console.log("START_AUTO_QUEUE clicked");
                      try {
                        const url = `${basePath}/api/auction/control`;
                        console.log("Fetching:", url);
                        const res = await fetch(url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'START_AUTO_QUEUE' })
                        });
                        
                        const data = await res.json();
                        
                        if (!res.ok) {
                          alert("Failed to start auction: " + (data.error || data.message || res.statusText));
                        } else if (data.state) {
                          console.log("Start Auto Queue - received state with player:", data.state.player?.name);
                          setLiveState(data.state);
                        } else {
                          console.log("Start Auto Queue Request Sent! (polling next)");
                          // Immediately fetch the updated live state
                          await fetchLiveState();
                        }
                      } catch (e: any) {
                        console.error("Fetch Error:", e);
                        alert("Client-side error: " + e.message);
                      }
                    }}
                    className="relative z-10 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-black text-sm sm:text-xl shadow-2xl shadow-indigo-500/40 transition-all active:scale-95 animate-pulse"
                  >
                    START AUTOMATED LIVE 🚀
                  </button>
                )}
              </div>

              {/* COUNTRY BREAKDOWN */}
              {stats && (
                <div className="glass-card p-4 sm:p-6 animate-in slide-in-from-bottom duration-700">
                  <h3 className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={14} className="sm:w-4 sm:h-4 text-indigo-400" /> Availability by Nationality
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {Object.entries(stats.countries).sort((a: any, b: any) => b[1] - a[1]).map(([country, count]: any) => (
                      <div key={country} className="flex items-center gap-2 sm:gap-3 bg-white/5 p-2 sm:p-3 rounded-xl border border-white/5">
                        <img src={getCountryFlag(country)!} className="w-6 h-4 sm:w-8 sm:h-6 object-cover rounded shadow" alt={country} />
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-gray-400 font-bold truncate">{country}</p>
                          <p className="text-sm sm:text-lg font-black text-white">{count}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`glass-card p-0 overflow-hidden relative transition-all duration-700 ${isAuctionEnded ? (liveState.highestBidderId ? 'border-amber-500 shadow-[0_0_50px_-12px_rgba(245,158,11,0.5)]' : 'border-gray-500 shadow-[0_0_50px_-12px_rgba(107,114,128,0.5)]') : 'border-indigo-500/30'}`}>


          <div className="p-6 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">

              {/* PLAYER INFO */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  {isAuctionEnded && liveState.highestBidderId && (
                    <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 p-2 sm:p-3 bg-amber-500 text-white rounded-full z-20 shadow-xl rotate-12 animate-bounce">
                      <Trophy size={24} className="sm:w-8 sm:h-8" />
                    </div>
                  )}
                  <img
                    src={dynamicMeta?.image || getPlayerImage(player.name, player.role)}
                    alt={player.name}
                    className="w-32 h-32 md:w-48 md:h-48 rounded-2xl md:rounded-3xl border-4 border-white/10 shadow-2xl relative z-10 object-cover bg-black"
                  />
                  {getCountryFlag(player.country) && (
                    <img src={getCountryFlag(player.country)!} alt={player.country || "India"} className="absolute -bottom-2 -right-1 md:-bottom-4 md:-right-2 w-10 h-7 md:w-16 md:h-11 object-cover rounded shadow-xl border-2 border-white/20 z-20" />
                  )}
                  {dynamicMeta?.team && (
                    <img src={getFranchiseFlag(dynamicMeta.team)} alt={dynamicMeta.team} className="absolute -top-3 -left-3 md:-top-4 md:-left-4 w-10 h-10 md:w-16 md:h-16 object-cover rounded-full shadow-2xl border-2 md:border-4 border-white/20 z-20 bg-white" />
                  )}
                  <div className="absolute inset-0 bg-indigo-500 blur-[80px] md:blur-[100px] opacity-20 -z-10"></div>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-4xl font-black mb-2">{player.name}</h2>
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 flex-wrap">
                    <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] sm:text-sm text-gray-300">
                      {player.country && player.country.trim() !== "" ? player.country : 'Indian'}
                    </span>
                    <span className="bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-sm border border-indigo-500/30">
                      {player.role}
                    </span>
                    {dynamicMeta?.team && (
                      <span className="bg-white/10 text-white font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-sm border border-white/20 flex items-center gap-1.5">
                        <img src={getFranchiseFlag(dynamicMeta.team)} alt={dynamicMeta.team} className="w-3.5 h-3.5 rounded-full object-cover bg-white" />
                        {dynamicMeta.team}
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-lg text-gray-400 mt-2 sm:mt-4 italic md:not-italic">Base Price: <span className="text-emerald-400 font-mono font-bold">₹{player.basePrice?.replace(/[^0-9.]/g, '') || "2.0"} Cr</span></p>
                </div>
              </div>

              {/* BIDDING INFO */}
              <div className="space-y-8 flex flex-col justify-center">

                {/* CURRENT HIGHEST */}
                <div className="bg-black/40 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 relative overflow-hidden text-center">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                  <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 sm:mb-2">Current Highest Bid</p>
                  <p className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-black text-emerald-400 font-mono tracking-tighter mb-2 sm:mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    ₹{currentHighest.toFixed(2)} <span className="text-lg md:text-2xl text-emerald-600">Cr</span>
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-3">
                    <span className="text-gray-500 text-[10px] sm:text-sm uppercase sm:normal-case font-bold sm:font-normal">Winning Franchise:</span>
                    {liveState.highestBidder ? (
                       <div className="flex items-center gap-2 bg-indigo-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-indigo-500/30">
                         <img src={getFranchiseFlag(liveState.highestBidder.name)} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-indigo-500/50 object-cover bg-white" alt="Franchise" />
                         <span className="font-bold text-base sm:text-xl text-white truncate max-w-[120px] sm:max-w-none">{liveState.highestBidder.name}</span>
                       </div>
                    ) : (
                       <span className="font-bold text-base sm:text-xl text-gray-600 italic">No Bids Yet</span>
                    )}
                  </div>
                </div>

                {/* SUMMARY OR BIDDING CONTROLS */}
                {isAuctionEnded ? (
                  <div className={`p-5 sm:p-6 rounded-2xl md:rounded-3xl text-center border ${liveState.highestBidderId ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
                    <h3 className={`text-2xl sm:text-3xl font-black mb-2 ${liveState.highestBidderId ? 'text-amber-500' : 'text-gray-400'}`}>
                      {liveState.highestBidderId ? 'SOLD!' : 'UNSOLD'}
                    </h3>
                    
                    <div className="mt-4 sm:mt-6 flex flex-col gap-3">
                      {session?.user?.name === 'admin' && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch(`${basePath}/api/auction/control`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'START_AUTO_QUEUE' })
                              });
                              const data = await res.json();
                              
                              if (!res.ok) {
                                alert("Failed to push next player: " + (data.error || data.message || res.statusText));
                              } else if (data.state) {
                                setLiveState(data.state);
                              } else {
                                // Immediately fetch the updated live state
                                await fetchLiveState();
                              }
                            } catch (e: any) {
                              alert("Error pushing next player: " + e.message);
                            }
                          }}
                          className="w-full py-3.5 sm:py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-lg sm:text-xl shadow-lg shadow-amber-500/25 transition-all outline-none"
                        >
                          AUTO NEXT 🚀
                        </button>
                      )}

                      {hasReadied ? (
                         <div className="py-3 sm:py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold animate-pulse text-center text-sm sm:text-base">
                           Waiting... ({readyTeamsArr.length})
                           {timeLeft !== null && timeLeft > 0 && <span className="ml-2 opacity-60">(Auto-push in {timeLeft}s)</span>}
                         </div>
                      ) : (
                         <button 
                           onClick={markReady}
                           className="w-full py-3.5 sm:py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-lg sm:text-xl shadow-lg shadow-emerald-500/25 transition-all outline-none"
                         >
                           READY ✅ {timeLeft !== null && timeLeft > 0 && <span className="text-sm opacity-60 ml-2">({timeLeft}s)</span>}
                         </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 relative">
                      {hasPassedId === player.id && (
                        <div className="absolute -inset-1 sm:-inset-2 -inset-x-2 sm:-inset-y-4 bg-black/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl sm:rounded-2xl border border-white/10">
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs bg-black/50 px-4 py-2 rounded-full border border-gray-500/30 shadow-2xl">You Folded</p>
                        </div>
                      )}

                      <button
                        onClick={() => placeBid(minimumNextBid)}
                        disabled={isBidding || !session}
                        className="col-span-3 py-4 sm:py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xl sm:text-2xl rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                      >
                        ⚡ BID ₹{minimumNextBid.toFixed(2)} Cr
                      </button>

                      <button onClick={() => placeBid(currentHighest + 0.5)} disabled={isBidding || !session} className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs sm:text-sm text-gray-300 transition-colors border border-white/5">
                        +₹0.5
                      </button>
                      <button onClick={() => placeBid(currentHighest + 1.0)} disabled={isBidding || !session} className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs sm:text-sm text-gray-300 transition-colors border border-white/5">
                        +₹1.0
                      </button>
                      <button onClick={() => placeBid(currentHighest + 2.0)} disabled={isBidding || !session} className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs sm:text-sm text-gray-300 transition-colors border border-white/5">
                        +₹2.0
                      </button>
                    </div>

                    <form onSubmit={handleCustomBid} className="flex gap-2 sm:gap-3">
                      <input
                        type="number" step="0.1" min={minimumNextBid}
                        value={customBid} onChange={(e) => setCustomBid(e.target.value)}
                        placeholder={`Min: ₹${minimumNextBid.toFixed(1)}`}
                        disabled={isBidding || !session || hasPassedId === player.id}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:opacity-50"
                      />
                      <button type="submit" disabled={isBidding || !session || hasPassedId === player.id} className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-xs sm:text-base font-bold rounded-xl transition-all shadow-lg disabled:opacity-50">
                        Custom
                      </button>
                    </form>

                    {canRTM && (
                      <button 
                        onClick={handleRTM}
                        className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm sm:text-xl rounded-xl sm:rounded-2xl shadow-xl shadow-amber-500/25 animate-pulse active:scale-[0.98]"
                      >
                        ⚡ RTM ₹{liveState.highestBid.toFixed(2)} Cr
                      </button>
                    )}

                    {hasPassedId !== player.id && (
                      <button 
                        onClick={() => setHasPassedId(player.id)}
                        className="w-full py-3 sm:py-4 text-gray-500 hover:text-gray-300 font-bold uppercase tracking-widest text-[10px] sm:text-xs bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl transition-all outline-none"
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
        <div className="space-y-4 lg:space-y-6">
          <h2 className="font-black text-gray-400 uppercase tracking-widest text-[10px] sm:text-xs flex items-center gap-2 px-1">
            <Trophy size={14} className="sm:w-4 sm:h-4 text-amber-500" /> Live Standings
          </h2>
          <div className="space-y-3 lg:space-y-4 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
            {teams.length === 0 ? <p className="text-gray-500 italic text-sm text-center py-4">No active franchises</p> : null}
            {teams.map(team => (
               <div key={team.id} className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all ${liveState.highestBidderId === team.id ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'bg-black/30 border-white/5 hover:border-white/10'}`}>
                 <div className="flex justify-between items-center mb-2 sm:mb-3">
                   <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                     <img src={getFranchiseFlag(team.name)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 border border-white/10 object-cover bg-white" alt="Team" />
                     <h3 className="font-black text-sm sm:text-base text-white truncate">{team.name}</h3>
                   </div>
                   <span className="font-mono text-emerald-400 font-black text-sm sm:text-lg">₹{team.budget.toFixed(1)}<span className="text-[10px] sm:text-xs ml-0.5 opacity-60">Cr</span></span>
                 </div>
                 
                 {team.players && team.players.length > 0 ? (
                   <details className="group">
                     <summary className="text-[10px] sm:text-xs text-indigo-400/70 cursor-pointer hover:text-indigo-400 list-none flex items-center justify-between font-bold bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 group-open:mb-3">
                       <span className="flex items-center gap-1.5">
                         <UserCheck size={12} /> View Squad ({team.players.length})
                       </span>
                       <span className="transition-transform group-open:rotate-180 text-[8px]">▼</span>
                     </summary>
                     <div className="space-y-1.5 sm:space-y-2 mt-2 max-h-[200px] overflow-y-auto pr-1">
                       {team.players.map((p: any) => (
                         <div key={p.id} className="flex justify-between items-center text-[10px] sm:text-xs text-gray-400 bg-black/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/5">
                           <span className="truncate pr-2 font-medium">{p.name} <span className="opacity-40 font-normal">({p.role.substring(0,3)})</span></span>
                           <span className="text-emerald-500 font-mono font-bold">₹{p.auctionPrice}</span>
                         </div>
                       ))}
                     </div>
                   </details>
                 ) : (
                   <p className="text-[10px] sm:text-xs text-gray-600 italic font-medium px-2.5">No players bought yet</p>
                 )}
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
