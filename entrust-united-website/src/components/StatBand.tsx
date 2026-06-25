import type { Stat } from '@content/types';

/** A band of large headline stats. */
export function StatBand({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <dt className="sr-only">{s.label}</dt>
          <dd>
            <span className="block font-heading text-5xl font-bold text-accent-400">
              {s.value}
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-brand-100">
              {s.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
