"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Lock } from "lucide-react";
import Link from "next/link";
import { basePath } from "@/lib/basePath";

export default function SignupPage() {
  const router = useRouter();
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPassword, setNewTeamPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newTeamPassword) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${basePath}/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newTeamName, 
          password: newTeamPassword, 
          budget: 125 // Default to 125 as the input field is removed
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create franchise");
      }

      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center py-6 sm:py-12 animate-in fade-in slide-in-from-bottom-4">
      <div className="glass-card p-6 sm:p-8 w-full max-w-lg border border-indigo-500/20 shadow-2xl">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 bg-teal-500/20 rounded-full text-teal-400">
            <UserPlus size={28} className="sm:w-8 sm:h-8" />
          </div>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black text-center mb-2">Create Franchise</h2>
        <p className="text-sm sm:text-base text-gray-400 text-center mb-6 sm:mb-8">Register a new team for the auction.</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2.5 rounded-lg mb-6 text-xs sm:text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={createTeam} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Franchise Name</label>
            <input 
              type="text" 
              required
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
              placeholder="e.g. Shlok's Strikers"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Secret Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                required
                value={newTeamPassword}
                onChange={e => setNewTeamPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">You will use this to login to your team during the auction.</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-teal-500/25 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? "Creating..." : "Register Franchise"}
          </button>

          <p className="text-center text-gray-400 text-sm mt-4">
            Already have a team? 
            <Link href="/login" className="text-indigo-400 font-bold hover:underline">
              Log in instead
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
