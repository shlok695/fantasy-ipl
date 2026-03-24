"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, Trophy, Star, Activity, Crown, ShieldAlert } from "lucide-react";
import { basePath } from "@/lib/basePath";
import { getCountryFlag, getPlayerImage } from "@/lib/playerIndex";
import { getPlayerTotalPoints, getTopPlayers, sortPlayersByPoints } from "@/lib/teamMetrics";

export default function MyTeamPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [captainId, setCaptainId] = useState("");
  const [viceCaptainId, setViceCaptainId] = useState("");
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [leadershipMessage, setLeadershipMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      setLoading(false);
      return;
    }

    const fetchTeam = async () => {
      try {
        const res = await fetch(`${basePath}/api/teams`, { cache: "no-store" });
        const data = await res.json();
        const myTeam = data.find((entry: any) => entry.id === (session.user as any).id) || null;
        setTeam(myTeam);
        if (myTeam) {
          setCaptainId((current) => current || myTeam.captainId || "");
          setViceCaptainId((current) => current || myTeam.viceCaptainId || "");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
    const interval = setInterval(fetchTeam, 10000);
    return () => clearInterval(interval);
  }, [session?.user, status]);

  if (loading || status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="glass-card p-8 sm:p-10 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-3">My Team</h1>
        <p className="text-gray-400 mb-6">Log in to see your full squad, player points, and top 11 starters.</p>
        <Link href="/login" className="inline-flex px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-colors">
          Go to Login
        </Link>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="glass-card p-8 sm:p-10 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-3">My Team</h1>
        <p className="text-gray-400">Your franchise data is not available yet.</p>
      </div>
    );
  }

  const sortedPlayers = sortPlayersByPoints(team.players || []);
  const top11 = getTopPlayers(team.players || [], 11);
  const bench = sortedPlayers.slice(11);
  const totalSquadPoints = sortedPlayers.reduce((sum, player) => sum + getPlayerTotalPoints(player), 0);
  const leadershipLocked = Boolean(team.captainId || team.viceCaptainId);

  const handleLeadershipSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadershipLoading(true);
    setLeadershipMessage(null);

    try {
      const res = await fetch(`${basePath}/api/user/leadership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captainId, viceCaptainId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save captain selections");
      }

      setLeadershipMessage({ type: "success", text: "Captain and vice-captain locked for the league." });
      await fetch(`${basePath}/api/teams`, { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => {
          const myTeam = data.find((entry: any) => entry.id === (session.user as any).id) || null;
          setTeam(myTeam);
        });
    } catch (error: any) {
      setLeadershipMessage({ type: "error", text: error.message });
    } finally {
      setLeadershipLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-indigo-500/20 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-300 mb-2">Franchise Hub</p>
          <h1 className="text-3xl sm:text-4xl font-black">{team.name}</h1>
          <p className="text-gray-400 mt-2">Your full squad, points breakdown, and best scoring XI.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="glass px-4 py-3 rounded-2xl min-w-[130px]">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">IPL Team</p>
            <p className="text-xl font-black text-indigo-300">{team.iplTeam || "Unpicked"}</p>
          </div>
          <div className="glass px-4 py-3 rounded-2xl min-w-[130px]">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Budget</p>
            <p className="text-xl font-black text-emerald-400">₹{team.budget.toFixed(1)} Cr</p>
          </div>
          <div className="glass px-4 py-3 rounded-2xl min-w-[130px]">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Leaderboard</p>
            <p className="text-xl font-black text-white">{team.totalPoints}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Squad Size</p>
          <p className="text-3xl font-black text-white">{sortedPlayers.length}</p>
          <p className="text-xs text-gray-500 mt-2">Full roster including bench</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Top XI Points</p>
          <p className="text-3xl font-black text-indigo-300">{team.totalPoints}</p>
          <p className="text-xs text-gray-500 mt-2">Leaderboard score uses your best 11</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Squad Total</p>
          <p className="text-3xl font-black text-amber-300">{totalSquadPoints}</p>
          <p className="text-xs text-gray-500 mt-2">All players combined</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Bench</p>
          <p className="text-3xl font-black text-rose-300">{bench.length}</p>
          <p className="text-xs text-gray-500 mt-2">Players outside the current top 11</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="text-amber-400" /> Leadership Picks
            </h2>
            <p className="text-sm text-gray-400 mt-1">Choose one captain and one vice-captain from your squad. Once saved, the league selection is locked.</p>
          </div>
          {leadershipLocked && (
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-full">
              Locked for League
            </span>
          )}
        </div>

        {leadershipMessage && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm border ${leadershipMessage.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
            {leadershipMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleLeadershipSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Captain</label>
              <select
                value={captainId}
                onChange={(e) => setCaptainId(e.target.value)}
                disabled={leadershipLocked || leadershipLoading}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              >
                <option value="">Select captain</option>
                {sortedPlayers.map((player: any) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({getPlayerTotalPoints(player)} pts)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Vice-Captain</label>
              <select
                value={viceCaptainId}
                onChange={(e) => setViceCaptainId(e.target.value)}
                disabled={leadershipLocked || leadershipLoading}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select vice-captain</option>
                {sortedPlayers.map((player: any) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({getPlayerTotalPoints(player)} pts)
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={leadershipLocked || leadershipLoading || !captainId || !viceCaptainId}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-colors disabled:opacity-50"
            >
              {leadershipLoading ? "Saving..." : "Lock Leadership Picks"}
            </button>
          </form>

          <div className="space-y-4">
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Captain</p>
              <p className="text-xl font-black text-amber-300">{team.captain?.name || "Not selected"}</p>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Vice-Captain</p>
              <p className="text-xl font-black text-indigo-300">{team.viceCaptain?.name || "Not selected"}</p>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-rose-300 shrink-0 mt-0.5" size={18} />
                <p>Selections are stored once for the league. The same player cannot be both captain and vice-captain.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="text-yellow-400" /> Starting XI
            </h2>
            <p className="text-sm text-gray-400 mt-1">These are the 11 players currently counting toward the leaderboard.</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 rounded-full">
            Top 11
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {top11.map((player: any, index: number) => {
            const totalPoints = getPlayerTotalPoints(player);
            return (
              <div key={player.id} className="bg-black/25 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-black shrink-0">
                  {index + 1}
                </div>
                <img src={getPlayerImage(player.name, player.role)} alt={player.name} className="w-14 h-14 rounded-2xl object-cover border border-white/10 bg-black" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold truncate">{player.name}</p>
                    {team.captainId === player.id && <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">C</span>}
                    {team.viceCaptainId === player.id && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">VC</span>}
                    {getCountryFlag(player.country) && (
                      <img src={getCountryFlag(player.country)!} alt={player.country || "India"} className="w-4 h-3 rounded object-cover shadow" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{player.role || "Player"}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-emerald-400 font-bold">₹{player.auctionPrice?.toFixed(1) || "0.0"} Cr</span>
                    <span className="text-white font-bold">{totalPoints} pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
            <Users className="text-indigo-400" /> Full Squad
          </h2>
          <div className="space-y-3">
            {sortedPlayers.map((player: any, index: number) => {
              const totalPoints = getPlayerTotalPoints(player);
              const isStarter = index < 11;
              return (
                <div key={player.id} className="bg-black/20 border border-white/5 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 ${isStarter ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300" : "bg-white/5 border border-white/10 text-gray-400"}`}>
                      {index + 1}
                    </div>
                    <img src={getPlayerImage(player.name, player.role)} alt={player.name} className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-black shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold truncate">{player.name}</p>
                        {team.captainId === player.id && <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">C</span>}
                        {team.viceCaptainId === player.id && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">VC</span>}
                        {getCountryFlag(player.country) && (
                          <img src={getCountryFlag(player.country)!} alt={player.country || "India"} className="w-4 h-3 rounded object-cover shadow shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{player.role || "Player"} • {player.type || "Uncategorized"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 text-sm">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Price</p>
                      <p className="text-emerald-400 font-bold">₹{player.auctionPrice?.toFixed(1) || "0.0"} Cr</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Points</p>
                      <p className="text-white font-bold">{totalPoints}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Status</p>
                      <p className={`font-bold ${isStarter ? "text-indigo-300" : "text-gray-400"}`}>{isStarter ? "Top 11" : "Bench"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Trophy className="text-amber-400" /> Team Notes
            </h2>
            <div className="space-y-3 text-sm text-gray-300">
              <p className="bg-black/20 border border-white/5 rounded-xl p-4">
                Your leaderboard score uses only your best 11 player totals plus team bonus points.
              </p>
              <p className="bg-black/20 border border-white/5 rounded-xl p-4">
                Bench players are still tracked here, so you can see who is close to breaking into the starting XI.
              </p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Activity className="text-rose-400" /> Quick Links
            </h2>
            <div className="space-y-3">
              <Link href="/auction/live" className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition-colors">
                Enter the live auction room
              </Link>
              <Link href="/profile" className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition-colors">
                Update franchise name or password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
