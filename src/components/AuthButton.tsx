"use client";
import { signIn, signOut } from "next-auth/react";
import { LogOut, LogIn } from "lucide-react";

export function AuthButton({ session }: { session: any }) {
  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-emerald-400 border border-emerald-500/30 px-3 py-1 bg-emerald-500/10 rounded-full">
          {session.user?.name}
        </span>
        <button 
          onClick={() => signOut()}
          className="flex items-center gap-2 hover:text-rose-400 transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => signIn()}
      className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
    >
      <LogIn size={16} /> Login
    </button>
  );
}
