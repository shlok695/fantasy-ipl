'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DashboardPlayer } from '@/components/dashboard/types';

type SoldPlayer = DashboardPlayer;

export default function AdminSoldPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [soldItems, setSoldItems] = useState<SoldPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.name !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  const fetchSoldItems = async () => {
    try {
      const res = await fetch('/ipl/api/players?status=sold', { cache: 'no-store' });
      const data = await res.json();
      setSoldItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.name === 'admin') {
      fetchSoldItems();
    }
  }, [session]);

  const filteredItems = soldItems.filter((item) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-[#0f0c29] text-white flex items-center justify-center">Loading...</div>;
  }

  if (session?.user?.name !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#0f0c29] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent uppercase tracking-tighter">
            Sold Players & Teams
          </h1>
          <Link href="/auction" className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/10">
            Back to Auction
          </Link>
        </div>

        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Search player or franchise..." 
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="glass-card overflow-hidden border border-white/10 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-emerald-400">Name</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-emerald-400">Type/Role</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-emerald-400">Purchased By</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-emerald-400 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{item.name}</div>
                      {item.role === 'IPL TEAM' && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded">TEAM</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {item.role || item.type || '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="font-medium">{item.user?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-black text-amber-400">
                      ₹{item.auctionPrice?.toFixed(2)} Cr
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-500 italic">
                      No sold items found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between items-center text-xs text-gray-500">
          <p>Total Items: {filteredItems.length}</p>
          <p>Admin Only View</p>
        </div>
      </div>
    </div>
  );
}
