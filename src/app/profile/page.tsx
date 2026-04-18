"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { KeyRound, PencilLine, ShieldCheck } from "lucide-react";
import { basePath } from "@/lib/basePath";
import type { DashboardTeam } from "@/components/dashboard/types";
import { getErrorMessage } from "@/lib/errorMessage";
import { getSessionUserId } from "@/lib/sessionUser";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const userId = getSessionUserId(session);
  const [team, setTeam] = useState<DashboardTeam | null>(null);
  const [newName, setNewName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setNewName(session.user.name);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchTeam = async () => {
      try {
        const res = await fetch(`${basePath}/api/teams`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Team request failed with ${res.status}`);
        }

        const data = await res.json();
        const teams: DashboardTeam[] = Array.isArray(data) ? data : [];
        const myTeam = teams.find((entry) => entry.id === userId) || null;
        setTeam(myTeam);
      } catch (error) {
        console.error(error);
      }
    };

    fetchTeam();
  }, [userId]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="glass-card p-8 sm:p-10 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-3">Profile</h1>
        <p className="text-gray-400 mb-6">Log in to manage your franchise name and password.</p>
        <Link href="/login" className="inline-flex px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-colors">
          Go to Login
        </Link>
      </div>
    );
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true);
    setNameMessage(null);

    try {
      const res = await fetch(`${basePath}/api/user/update-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update franchise name");
      }

      await update({ name: data.name });
      setNameMessage({ type: "success", text: "Franchise name updated." });
      router.refresh();
    } catch (error: unknown) {
      setNameMessage({ type: "error", text: getErrorMessage(error, "Failed to update franchise name") });
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const res = await fetch(`${basePath}/api/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Password updated. You can keep using the current session." });
    } catch (error: unknown) {
      setPasswordMessage({ type: "error", text: getErrorMessage(error, "Failed to reset password") });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-indigo-500/20 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-300 mb-2">Franchise Profile</p>
          <h1 className="text-3xl sm:text-4xl font-black">{session.user.name}</h1>
          <p className="text-gray-400 mt-2">Manage your franchise identity and sign-in details here.</p>
        </div>
        <div className="glass px-5 py-4 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Linked IPL Team</p>
          <p className="text-xl font-black text-indigo-300">{team?.iplTeam || "Unpicked"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/15 rounded-2xl text-indigo-300">
              <PencilLine size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Rename Franchise</h2>
              <p className="text-sm text-gray-400">This replaces the inline dashboard rename button.</p>
            </div>
          </div>

          {nameMessage && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm border ${nameMessage.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
              {nameMessage.text}
            </div>
          )}

          <form onSubmit={handleRename} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Franchise Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter new franchise name"
              />
            </div>
            <button
              type="submit"
              disabled={nameLoading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-colors disabled:opacity-50"
            >
              {nameLoading ? "Saving..." : "Save New Name"}
            </button>
          </form>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-rose-500/15 rounded-2xl text-rose-300">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Reset Password</h2>
              <p className="text-sm text-gray-400">Use your current password to set a new one safely.</p>
            </div>
          </div>

          {passwordMessage && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm border ${passwordMessage.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Old Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Enter old password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-colors disabled:opacity-50"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="text-emerald-400" />
          <h2 className="text-xl font-bold">Account Actions</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/team" className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            Open My Team
          </Link>
          <button
            onClick={() => signOut()}
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
