import type { Feature } from '@content/types';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/cn';

/** Responsive grid of icon + title + body feature cards. */
export function FeatureGrid({
  features,
  columns = 3,
  invert = false,
}: {
  features: Feature[];
  columns?: 2 | 3 | 4;
  invert?: boolean;
}) {
  const colClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <ul className={cn('grid grid-cols-1 gap-6', colClass)}>
      {features.map((f) => (
        <li
          key={f.title}
          className={cn(
            'rounded-2xl border p-6 transition-shadow hover:shadow-md',
            invert
              ? 'border-brand-700 bg-brand-900/40'
              : 'border-brand-100 bg-white',
          )}
        >
          <span
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-xl',
              invert ? 'bg-accent-500/15 text-accent-300' : 'bg-accent-50 text-accent-600',
            )}
          >
            <Icon name={f.icon} className="h-6 w-6" />
          </span>
          <h3
            className={cn(
              'mt-4 font-heading text-xl font-semibold',
              invert ? 'text-white' : 'text-brand-900',
            )}
          >
            {f.title}
          </h3>
          <p className={cn('mt-2 leading-relaxed', invert ? 'text-brand-200' : 'text-brand-700')}>
            {f.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
