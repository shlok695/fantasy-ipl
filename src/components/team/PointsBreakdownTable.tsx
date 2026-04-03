"use client";

type BreakdownLine = { label: string; value: number };

type ParsedBreakdown = {
  lines?: BreakdownLine[];
  subtotal?: number;
  multiplierLabel?: string;
  multiplierValue?: number;
  finalPoints?: number;
};

export function PointsBreakdownTable({ breakdownJson }: { breakdownJson: string | null | undefined }) {
  if (!breakdownJson?.trim()) {
    return (
      <p className="text-[11px] text-gray-500 mt-2 pl-1">
        No line-by-line breakdown for this entry (e.g. manual edit).
      </p>
    );
  }

  let parsed: ParsedBreakdown;
  try {
    parsed = JSON.parse(breakdownJson) as ParsedBreakdown;
  } catch {
    return <p className="text-[11px] text-amber-300/90 mt-2">Could not read stored breakdown.</p>;
  }

  const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
  const subtotal = typeof parsed.subtotal === "number" ? parsed.subtotal : null;
  const multLabel = parsed.multiplierLabel || "Normal";
  const multVal = typeof parsed.multiplierValue === "number" ? parsed.multiplierValue : 1;
  const finalPoints = typeof parsed.finalPoints === "number" ? parsed.finalPoints : null;

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/35">
      <table className="w-full min-w-[280px] border-collapse text-left text-[11px] sm:text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.04]">
            <th className="px-3 py-2 font-bold uppercase tracking-wider text-gray-400">Component</th>
            <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-gray-400 tabular-nums">
              Points
            </th>
          </tr>
        </thead>
        <tbody className="text-gray-200">
          {lines.map((line, i) => (
            <tr key={`${line.label}-${i}`} className="border-b border-white/[0.06] last:border-0">
              <td className="px-3 py-1.5 text-gray-300">{line.label}</td>
              <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-emerald-200/95">
                {line.value}
              </td>
            </tr>
          ))}
          {subtotal !== null && (
            <tr className="border-t border-white/15 bg-white/[0.03]">
              <td className="px-3 py-2 font-bold text-gray-200">Subtotal before multiplier</td>
              <td className="px-3 py-2 text-right font-black tabular-nums text-white">{subtotal}</td>
            </tr>
          )}
          <tr className="bg-indigo-500/10">
            <td className="px-3 py-2 font-semibold text-indigo-200/95">
              Multiplier ({multLabel} ×{multVal})
            </td>
            <td className="px-3 py-2 text-right text-[11px] font-bold italic text-indigo-200/90">applied</td>
          </tr>
          {finalPoints !== null && (
            <tr className="border-t border-cyan-400/20 bg-cyan-500/10">
              <td className="px-3 py-2 font-black text-cyan-100">Final points</td>
              <td className="px-3 py-2 text-right font-black tabular-nums text-cyan-200">{finalPoints}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
