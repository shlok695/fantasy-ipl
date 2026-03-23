"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      name,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-4">
      <div className="glass-card p-6 sm:p-8 w-full max-w-md border border-indigo-500/20 shadow-2xl">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 bg-indigo-500/20 rounded-full text-indigo-400">
            <Lock size={28} className="sm:w-8 sm:h-8" />
          </div>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black text-center mb-2">Team Login</h2>
        <p className="text-sm sm:text-base text-gray-400 text-center mb-6 sm:mb-8">Sign in to manage your franchise bids and points.</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2.5 rounded-lg mb-6 text-xs sm:text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Franchise Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your exact team name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all active:scale-[0.98] mt-4 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login to Franchise"}
          </button>

          <p className="text-center text-gray-400 text-sm mt-4">
            Don't have a team yet? <Link href="/signup" className="text-indigo-400 font-bold hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
