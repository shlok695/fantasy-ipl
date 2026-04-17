"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, Trophy, Star, Activity, Crown, ShieldAlert } from "lucide-react";
import { basePath } from "@/lib/basePath";
import { MatchBreakdownPanel } from "@/components/team/MatchBreakdownPanel";
import { ExpandableSquadPlayerRow } from "@/components/team/ExpandableSquadPlayerRow";
import { getCountryFlag, getPlayerImage } from "@/lib/playerIndex";
import { TeamViewTabs, type TeamViewTabId } from "@/components/team/TeamViewTabs";
import {
  getLatestAndPreviousTeamMatches,
  getTeamMatchDateLabel,
} from "@/lib/teamHistory";
import { getPlayerTotalPoints, getTopPlayers, sortPlayersByPoints } from "@/lib/teamMetrics";

export default function MyTeamPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [captainId, setCaptainId] = useState("");
  const [viceCaptainId, setViceCaptainId] = useState("");
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [leadershipMessage, setLeadershipMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [teamTab, setTeamTab] = useState<TeamViewTabId>("overview");

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
        if (!res.ok) {
          throw new Error(`Team request failed with ${res.status}`);
        }

        const data = await res.json();
        const teams = Array.isArray(data) ? data : [];
        const myTeam = teams.find((entry: any) => entry.id === (session.user as any).id) || null;
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
  const { latestMatch, previousMatch, matches } = getLatestAndPreviousTeamMatches(team);
  const captainPlayer = sortedPlayers.find((p: any) => p.id === team.captainId);
  const viceCaptainPlayer = sortedPlayers.find((p: any) => p.id === team.viceCaptainId);

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
          const teams = Array.isArray(data) ? data : [];
          const myTeam = teams.find((entry: any) => entry.id === (session.user as any).id) || null;
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

      <TeamViewTabs active={teamTab} onChange={setTeamTab} variant="franchise" />

      {teamTab === "overview" && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
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
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Latest Match</p>
          <p className="text-3xl font-black text-cyan-300">{latestMatch ? Math.round(latestMatch.totalPoints) : 0}</p>
          <p className="text-xs text-gray-500 mt-2">{latestMatch?.compactMatchLabel || "No match points yet"}</p>
          {getTeamMatchDateLabel(latestMatch) && (
            <p className="text-[11px] text-gray-500 mt-1">{getTeamMatchDateLabel(latestMatch)}</p>
          )}
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Previous Match</p>
          <p className="text-3xl font-black text-violet-300">{previousMatch ? Math.round(previousMatch.totalPoints) : 0}</p>
          <p className="text-xs text-gray-500 mt-2">{previousMatch?.compactMatchLabel || "Waiting for next score"}</p>
          {getTeamMatchDateLabel(previousMatch) && (
            <p className="text-[11px] text-gray-500 mt-1">{getTeamMatchDateLabel(previousMatch)}</p>
          )}
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
                    {player.name} · IPL {player.iplTeam || "—"} · {getPlayerTotalPoints(player)} pts
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
                    {player.name} · IPL {player.iplTeam || "—"} · {getPlayerTotalPoints(player)} pts
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
              {captainPlayer?.iplTeam && (
                <p className="text-xs text-indigo-300/90 font-semibold mt-1">IPL {captainPlayer.iplTeam}</p>
              )}
            </div>
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Vice-Captain</p>
              <p className="text-xl font-black text-indigo-300">{team.viceCaptain?.name || "Not selected"}</p>
              {viceCaptainPlayer?.iplTeam && (
                <p className="text-xs text-indigo-300/90 font-semibold mt-1">IPL {viceCaptainPlayer.iplTeam}</p>
              )}
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
          {top11.map((player: any, index: number) => (
            <ExpandableSquadPlayerRow
              key={player.id}
              player={player}
              rank={index + 1}
              isStarter
              captainId={team.captainId}
              viceCaptainId={team.viceCaptainId}
              variant="franchise"
              countryFlag={
                getCountryFlag(player.country) ? (
                  <img
                    src={getCountryFlag(player.country)!}
                    alt={player.country || "India"}
                    className="w-4 h-3 rounded object-cover shadow shrink-0"
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-5">
            <Users className="text-indigo-400" /> Full Squad
          </h2>
          <div className="space-y-3">
            {sortedPlayers.map((player: any, index: number) => (
              <ExpandableSquadPlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                isStarter={index < 11}
                captainId={team.captainId}
                viceCaptainId={team.viceCaptainId}
                variant="franchise"
                countryFlag={
                  getCountryFlag(player.country) ? (
                    <img
                      src={getCountryFlag(player.country)!}
                      alt={player.country || "India"}
                      className="w-4 h-3 rounded object-cover shadow shrink-0"
                    />
                  ) : undefined
                }
              />
            ))}
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
        </>
      )}

      {teamTab === "matches" && (
        <MatchBreakdownPanel
          title="Match History"
          subtitle="Newest first. Dates use the official match start when synced. Expand players on Overview for a personal timeline."
          matches={matches}
          emptyMessage="Your match-by-match squad totals will appear here once points are synced."
        />
      )}
    </div>
  );
}
