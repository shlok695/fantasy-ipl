import { HelpCircle, Star, Target, Shield, Zap } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-center flex-col items-center gap-4 border-b border-white/10 pb-8 pt-4">
        <div className="p-4 bg-teal-500/20 rounded-full text-teal-400 mb-2">
          <HelpCircle size={48} />
        </div>
        <h1 className="text-4xl font-black text-white text-center">Fantasy Points System</h1>
        <p className="text-gray-400 text-center max-w-2xl">
          Here is exactly how players earn points for your franchise during live matches. We strictly follow the standard T20 Fantasy Points ruleset.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* BATTING */}
        <div className="glass-card p-6 border border-white/5">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-rose-400">
            <Target size={24} /> Batting Points
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Run</span> <span className="text-emerald-400 font-bold">+1 pt</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Boundary Bonus</span> <span className="text-emerald-400 font-bold">+1 pt</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Six Bonus</span> <span className="text-emerald-400 font-bold">+2 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>30 Run Bonus</span> <span className="text-emerald-400 font-bold">+4 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Half-Century Bonus</span> <span className="text-emerald-400 font-bold">+8 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Century Bonus</span> <span className="text-emerald-400 font-bold">+16 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Dismissal for a Duck</span> <span className="text-rose-400 font-bold">-2 pts</span></div>
            
            <div className="pt-4">
              <h3 className="font-semibold text-gray-400 mb-2">Strike Rate (Min 10 Balls)</h3>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Above 170 SR</span> <span className="text-emerald-400">+6 pts</span></div>
                <div className="flex justify-between"><span>150.01 - 170 SR</span> <span className="text-emerald-400">+4 pts</span></div>
                <div className="flex justify-between"><span>130 - 150 SR</span> <span className="text-emerald-400">+2 pts</span></div>
                <div className="flex justify-between"><span>60 - 70 SR</span> <span className="text-rose-400">-2 pts</span></div>
                <div className="flex justify-between"><span>50 - 59.99 SR</span> <span className="text-rose-400">-4 pts</span></div>
                <div className="flex justify-between"><span>Below 50 SR</span> <span className="text-rose-400">-6 pts</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* BOWLING */}
        <div className="glass-card p-6 border border-white/5">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-indigo-400">
            <Shield size={24} /> Bowling Points
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Wicket (excluding run out)</span> <span className="text-emerald-400 font-bold">+25 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Bonus (LBW / Bowled)</span> <span className="text-emerald-400 font-bold">+8 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>3 Wicket Bonus</span> <span className="text-emerald-400 font-bold">+4 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>4 Wicket Bonus</span> <span className="text-emerald-400 font-bold">+12 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>5 Wicket Bonus</span> <span className="text-emerald-400 font-bold">+16 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Maiden Over</span> <span className="text-emerald-400 font-bold">+12 pts</span></div>
            
            <div className="pt-4">
              <h3 className="font-semibold text-gray-400 mb-2">Economy Rate (Min 2 Overs)</h3>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Below 5 runs/over</span> <span className="text-emerald-400">+6 pts</span></div>
                <div className="flex justify-between"><span>5 - 5.99 runs/over</span> <span className="text-emerald-400">+4 pts</span></div>
                <div className="flex justify-between"><span>6 - 7 runs/over</span> <span className="text-emerald-400">+2 pts</span></div>
                <div className="flex justify-between"><span>10 - 11 runs/over</span> <span className="text-rose-400">-2 pts</span></div>
                <div className="flex justify-between"><span>11.01 - 12 runs/over</span> <span className="text-rose-400">-4 pts</span></div>
                <div className="flex justify-between"><span>Above 12 runs/over</span> <span className="text-rose-400">-6 pts</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* FIELDING */}
        <div className="glass-card p-6 border border-white/5">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-emerald-400">
            <Star size={24} /> Fielding Points
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Catch</span> <span className="text-emerald-400 font-bold">+8 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>3 Catch Bonus</span> <span className="text-emerald-400 font-bold">+4 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Stumping</span> <span className="text-emerald-400 font-bold">+12 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Run Out (Direct Hit)</span> <span className="text-emerald-400 font-bold">+12 pts</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Run Out (Not indirect)</span> <span className="text-emerald-400 font-bold">+6 pts</span></div>
          </div>
        </div>

        {/* OTHERS */}
        <div className="glass-card p-6 border border-white/5">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-yellow-400">
            <Zap size={24} /> Multipliers & Other
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Captain</span> <span className="text-yellow-400 font-bold">2x Points</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>Vice-Captain</span> <span className="text-yellow-400 font-bold">1.5x Points</span></div>
            <div className="flex justify-between border-b border-white/5 pb-2"><span>In Starting XI / Substitute</span> <span className="text-emerald-400 font-bold">+4 pts</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
