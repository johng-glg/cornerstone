import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Inline notice used for compliance disclaimers and [DRAFT]/[CONFIRM] callouts.
 * `tone="draft"` is visually stronger for attorney-review banners.
 */
export function Disclaimer({
  children,
  tone = 'info',
  className,
}: {
  children: React.ReactNode;
  tone?: 'info' | 'draft';
  className?: string;
}) {
  const isDraft = tone === 'draft';
  const Icon = isDraft ? AlertTriangle : Info;
  return (
    <div
      role="note"
      className={cn(
        'flex gap-3 rounded-xl border p-4 text-sm leading-relaxed',
        isDraft
          ? 'border-accent-300 bg-accent-50 text-brand-800'
          : 'border-brand-200 bg-brand-50 text-brand-700',
        className,
      )}
    >
      <Icon
        className={cn('mt-0.5 h-5 w-5 flex-none', isDraft ? 'text-accent-600' : 'text-brand-500')}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}
