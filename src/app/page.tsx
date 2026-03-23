"use client";

import { useEffect, useState } from 'react';
import { Trophy, Users, UserPlus, Star, Target, Shield, Zap, Activity } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getPlayerImage, getCountryFlag, getPlayerMeta, getFranchiseFlag } from '@/lib/playerIndex';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState('Init');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamBudget, setNewTeamBudget] = useState('100');
  const [iplTeam, setIplTeam] = useState('');
  const [isSelectingTeam, setIsSelectingTeam] = useState(false);

  const IPL_TEAMS = ['CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RR', 'RCB', 'SRH'];

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const handleSelectTeam = async (team: string) => {
    try {
      const res = await fetch(`${basePath}/api/user/select-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iplTeam: team })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      alert("Failed to select team");
    }
  };
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const handleUpdateName = async () => {
    if (!editedName || editedName.trim() === session?.user?.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const res = await fetch(`${basePath}/api/user/update-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: editedName })
      });
      if (res.ok) {
        window.location.reload(); // Refresh to update session
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      alert("Failed to update name");
    }
  };

  const fetchTeams = async () => {
    try {
      setDebugMsg('Starting fetch...');
      const url = `${basePath}/api/teams`;
      setDebugMsg(`Fetching ${url}...`);
      const res = await fetch(url, { cache: 'no-store' });
      setDebugMsg(`Fetched! Status: ${res.status}`);
      const data = await res.json();
      setDebugMsg(`Parsed JSON. Setting Teams...`);
      setTeams(data);
      setDebugMsg(`Done!`);
    } catch (e: any) {
      setDebugMsg(`Error: ${e.message}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    const interval = setInterval(fetchTeams, 5000); // Live update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const myTeam = teams.find(t => t.id === (session?.user as any)?.id);

  if (loading || status === "loading") {
    return (
      <div className="flex justify-center items-center h-64 flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Calculate granular top performers globally
  const allPlayers = teams.flatMap(t => t.players || []);
  
  const playerAggStats = allPlayers.map(p => {
    let totalRuns = 0;
    let totalBalls = 0;
    let totalWickets = 0;
    let totalDotBalls = 0;
    let totalPoints = 0;
    
    p.points?.forEach((match: any) => {
      totalRuns += match.runs || 0;
      totalBalls += match.ballsFaced || 0;
      totalWickets += match.wickets || 0;
      totalDotBalls += match.dotBalls || 0;
      totalPoints += match.points || 0;
    });
    
    const sr = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    return { ...p, totalRuns, totalBalls, totalWickets, totalDotBalls, sr, totalPoints };
  });

  let topPlayer = null;
  let topRunScorer = null;
  let topWicketTaker = null;
  let topStriker = null;
  let topDotBalls = null;
  let topPlayerPoints = 0;

  if (playerAggStats.length > 0) {
    topPlayer = playerAggStats.reduce((max: any, cur: any) => cur.totalPoints > max.totalPoints ? cur : max, playerAggStats[0]);
    topRunScorer = playerAggStats.reduce((max: any, cur: any) => cur.totalRuns > max.totalRuns ? cur : max, playerAggStats[0]);
    topWicketTaker = playerAggStats.reduce((max: any, cur: any) => cur.totalWickets > max.totalWickets ? cur : max, playerAggStats[0]);
    topDotBalls = playerAggStats.reduce((max: any, cur: any) => cur.totalDotBalls > max.totalDotBalls ? cur : max, playerAggStats[0]);
    
    const validStrikers = playerAggStats.filter((p: any) => p.totalBalls >= 10);
    if (validStrikers.length > 0) {
      topStriker = validStrikers.reduce((max: any, cur: any) => cur.sr > max.sr ? cur : max, validStrikers[0]);
    }

    topPlayerPoints = topPlayer.totalPoints;

    if (topPlayerPoints === 0) topPlayer = null;
    if (topRunScorer?.totalRuns === 0) topRunScorer = null;
    if (topWicketTaker?.totalWickets === 0) topWicketTaker = null;
    if (topDotBalls?.totalDotBalls === 0) topDotBalls = null;
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 pt-4 sm:pt-10">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 via-purple-400 to-rose-400 inline-block px-4">
          Fantasy IPL Leaderboard
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
          The ultimate showdown. Build your squad, manage your budget, and track live points.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEADERBOARD */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-white/5">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Trophy className="text-yellow-400" /> Rankings
            </h2>
            
            {teams.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No teams created yet. Start by adding your family members!
              </div>
            ) : (
              <div className="space-y-4">
                {teams.map((team, idx) => (
                  <div key={team.id} className="glass p-4 rounded-xl flex flex-col gap-4 hover-glow group transition-all">
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                          ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 
                            idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/50' :
                            'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg sm:text-xl truncate flex items-center gap-2">
                            {team.name}
                            {team.iplTeam && (
                              <span className="text-[10px] sm:text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                                {team.iplTeam}
                              </span>
                            )}
                            {session?.user?.name === 'admin' && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Are you absolutely sure you want to permanently delete the franchise '${team.name}'? All their players will be released. This cannot be undone.`)) {
                                    try {
                                      const res = await fetch(`${basePath}/api/teams/remove`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ teamId: team.id })
                                      });
                                      if (res.ok) window.location.reload();
                                      else alert((await res.json()).error);
                                    } catch(e) { alert("Failed to delete franchise"); }
                                  }
                                }}
                                className="ml-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/50 rounded px-2 py-0.5 text-[10px] sm:text-xs font-bold transition-all"
                                title={`Delete ${team.name}`}
                              >
                                Delete Team
                              </button>
                            )}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1">
                            <Users size={14} /> {team.players?.length || 0} Players
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-8 bg-black/20 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">Budget</p>
                        {session?.user?.name === 'admin' ? (
                          <div className="flex items-center justify-start sm:justify-end gap-1 font-mono text-emerald-400">
                            ₹
                            <input
                              type="number"
                              key={team.budget}
                              defaultValue={team.budget}
                              onBlur={async (e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val !== team.budget) {
                                  await fetch(`${basePath}/api/teams/budget`, { 
                                    method: 'POST', 
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ teamId: team.id, newBudget: val }) 
                                  });
                                }
                              }}
                              className="w-16 bg-transparent border-b border-emerald-500/30 text-emerald-400 focus:outline-none focus:border-emerald-400 text-left sm:text-right font-bold"
                            />
                            Cr
                          </div>
                        ) : (
                          <p className="font-mono text-emerald-400 font-bold text-sm sm:text-base">₹{team.budget.toFixed(1)} Cr</p>
                        )}
                        </div>
                        <div className="bg-indigo-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-indigo-500/30 text-center min-w-[80px] sm:min-w-[100px]">
                          <p className="text-[10px] sm:text-xs text-indigo-300 uppercase tracking-wider font-semibold">Points</p>
                          <p className="font-black text-xl sm:text-2xl text-white">{team.totalPoints}</p>
                        </div>
                      </div>
                    </div>

                    {/* SQUAD LIST */}
                    {team.players && team.players.length > 0 && (
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:pl-14 pt-2 border-t border-white/5 sm:border-0 sm:pt-0 mt-2 sm:mt-0">
                        {team.players.map((p: any) => (
                          <div key={p.id} className="bg-black/30 border border-white/5 rounded px-2 flex justify-between items-center group-hover:border-white/10 transition-colors h-8 group">
                            <span className="truncate pr-2 text-[10px] sm:text-xs text-gray-300">{p.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] sm:text-xs text-indigo-400 font-bold whitespace-nowrap">₹{p.auctionPrice?.toFixed(1)}</span>
                              {session?.user?.name === 'admin' && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to drop ${p.name} from ${team.name}? This will refund ₹${p.auctionPrice?.toFixed(1)} Cr.`)) {
                                      try {
                                        const res = await fetch(`${basePath}/api/auction/drop`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ playerId: p.id })
                                        });
                                        if (res.ok) fetchTeams();
                                        else alert((await res.json()).error);
                                      } catch(e) { alert("Failed to drop player"); }
                                    }
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                                  title={`Drop ${p.name}`}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ACTION CARDS */}
        <div className="space-y-6">
          {session ? (
            <div className="glass-card p-6 border border-white/5 flex flex-col items-center justify-center text-center min-h-[320px] relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-transparent">
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => {
                    setEditedName(session?.user?.name || '');
                    setIsEditingName(!isEditingName);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                  title="Change Franchise Name"
                >
                  <Activity size={18} />
                </button>
              </div>

              {isEditingName ? (
                <div className="space-y-4 w-full px-4 py-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Change Franchise Name</h3>
                  <input 
                    type="text" 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full bg-black/40 border border-indigo-500/30 rounded-lg px-3 py-2 text-white text-center focus:border-indigo-400 outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleUpdateName} className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-bold text-sm">Save</button>
                    <button onClick={() => setIsEditingName(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg font-bold text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Squad</p>
                      <p className="text-xl font-black text-white">{myTeam?.players?.length || 0} <span className="text-[10px] opacity-40">/15</span></p>
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Partner</p>
                      <p className="text-xl font-black text-indigo-400">{myTeam?.iplTeam || 'NONE'}</p>
                    </div>
                  </div>

                  {topPlayer ? (
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs text-gray-500 uppercase font-black mb-2 flex items-center justify-center gap-1">
                        <Star size={12} className="text-yellow-400" /> MVP Leader
                      </p>
                      <div className="flex items-center gap-3 justify-center">
                        <img src={getPlayerImage(topPlayer.name, topPlayer.role)} alt="MVP" className="w-10 h-10 rounded-full border border-emerald-500/30 object-cover bg-black" />
                        <div className="text-left">
                          <p className="font-bold text-sm truncate max-w-[120px]">{topPlayer.name}</p>
                          <p className="text-[10px] text-emerald-400 font-mono">{topPlayer.totalPoints} PTS</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-white/5 text-gray-600 text-[10px] italic">
                      Waiting for player points to sync...
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 border border-white/5 flex flex-col items-center justify-center text-center h-[200px]">
              <UserPlus className="text-indigo-400 mb-4" size={48} />
              <h3 className="text-xl font-bold mb-2">Join the League</h3>
              <p className="text-gray-400 text-sm mb-4">Create your own franchise, get your starting budget, and enter the auction.</p>
              <Link 
                href="/signup"
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 rounded-full text-white font-bold transition-transform active:scale-95 shadow-lg"
              >
                Sign Up Now
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* TOP PERFORMERS GRID */}
      {session && (topRunScorer || topWicketTaker) && (
        <div className="pt-8 border-t border-white/10">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
            <Activity className="text-indigo-400" /> League Leaders
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Highest Runs */}
            {topRunScorer && (
              <div className="glass-card p-5 border-t-4 border-t-orange-500 hover:-translate-y-1 transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><Target size={20} /></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-1 rounded">Orange Cap</span>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Highest Run Scorer</h3>
                <p className="font-bold text-lg leading-tight mb-2">{topRunScorer.name}</p>
                <div className="flex items-end justify-between">
                  <p className="text-xs text-gray-500">{topRunScorer.user?.name}</p>
                  <p className="text-2xl font-black text-orange-400">{topRunScorer.totalRuns} <span className="text-sm">R</span></p>
                </div>
              </div>
            )}

            {/* Most Wickets */}
            {topWicketTaker && (
              <div className="glass-card p-5 border-t-4 border-t-purple-500 hover:-translate-y-1 transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Shield size={20} /></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-1 rounded">Purple Cap</span>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Most Wickets</h3>
                <p className="font-bold text-lg leading-tight mb-2">{topWicketTaker.name}</p>
                <div className="flex items-end justify-between">
                  <p className="text-xs text-gray-500">{topWicketTaker.user?.name}</p>
                  <p className="text-2xl font-black text-purple-400">{topWicketTaker.totalWickets} <span className="text-sm">W</span></p>
                </div>
              </div>
            )}

            {/* Highest Strike Rate */}
            {topStriker && (
              <div className="glass-card p-5 border-t-4 border-t-rose-500 hover:-translate-y-1 transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><Zap size={20} /></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-1 rounded">Firepower</span>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Highest Strike Rate</h3>
                <p className="font-bold text-lg leading-tight mb-2">{topStriker.name}</p>
                <div className="flex items-end justify-between">
                  <p className="text-xs text-gray-500">{topStriker.user?.name}</p>
                  <p className="text-2xl font-black text-rose-400">{topStriker.sr.toFixed(1)}</p>
                </div>
              </div>
            )}

            {/* Most Dot Balls */}
            {topDotBalls && (
              <div className="glass-card p-5 border-t-4 border-t-emerald-500 hover:-translate-y-1 transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Trophy size={20} /></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Control</span>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Most Dot Balls</h3>
                <p className="font-bold text-lg leading-tight mb-2">{topDotBalls.name}</p>
                <div className="flex items-end justify-between">
                  <p className="text-xs text-gray-500">{topDotBalls.user?.name}</p>
                  <p className="text-2xl font-black text-emerald-400">{topDotBalls.totalDotBalls} <span className="text-sm">Dots</span></p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
