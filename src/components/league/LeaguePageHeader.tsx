import Link from "next/link";

interface LeaguePageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function LeaguePageHeader({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: LeaguePageHeaderProps) {
  return (
    <section className="dashboard-hero dashboard-fade-in relative overflow-hidden rounded-[32px] border border-white/10 px-6 py-8 sm:px-8">
      <div className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-200">{eyebrow}</p>
          <h1 className="font-display text-4xl font-black uppercase text-white sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
        </div>
        {(primaryHref || secondaryHref) && (
          <div className="flex flex-col gap-3 sm:flex-row">
            {primaryHref && primaryLabel ? (
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
              >
                {primaryLabel}
              </Link>
            ) : null}
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-bold text-white transition-colors duration-300 hover:border-cyan-300/30 hover:bg-cyan-400/10"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

