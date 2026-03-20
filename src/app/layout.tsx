import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthButton } from "@/components/AuthButton";
import { HelpCircle } from "lucide-react";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: 'Fantasy IPL Auction & League',
  description: 'Manage your IPL Auction and squads with family and friends.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="antialiased bg-[#0f111a] text-white selection:bg-indigo-500/30 min-h-screen flex flex-col relative overflow-x-hidden">
        <Providers>
        {/* Background Gradients */}
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-rose-600/20 blur-[120px] rounded-full pointer-events-none" />

        <nav className="sticky top-0 z-50 glass border-b border-indigo-500/20 py-4 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <Link href="/" className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-rose-400 drop-shadow-sm">
              FANTASY IPL
            </Link>
            <div className="flex space-x-6 text-sm font-medium items-center">
              <Link href="/" className="hover:text-indigo-400 transition-colors">Dashboard</Link>
              <Link href="/auction/live" className="hover:text-rose-400 transition-colors flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                Live Room
              </Link>
              {session?.user?.name === 'admin' && (
                <>
                  <Link href="/auction" className="hover:text-indigo-400 transition-colors">Auction Admin</Link>
                  <Link href="/admin/points" className="hover:text-indigo-400 transition-colors">Points Admin</Link>
                </>
              )}
              <Link href="/rules" className="text-gray-400 hover:text-white transition-colors" title="How to Play & Points System">
                <HelpCircle size={20} />
              </Link>
              <div className="w-px h-4 bg-white/10 mx-2"></div>
              <AuthButton session={session} />
            </div>
          </div>
        </nav>

        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 pb-20">
          {children}
        </main>
        </Providers>
      </body>
    </html>
  );
}
