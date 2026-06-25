import { cn } from '@/lib/cn';

/**
 * Inline SVG wordmark + symbol. Swap this for a real logo file when available
 * (drop an SVG/PNG in /public and replace the markup here).
 */
export function Logo({
  className,
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 flex-none"
        role="img"
        aria-label="Entrust United logo"
      >
        {/* Shield = protection; heart = care. */}
        <path
          d="M20 3l13 4.2v9.1c0 8.6-5.4 16.4-13 19.7C12.4 32.7 7 24.9 7 16.3V7.2L20 3z"
          className={invert ? 'fill-white/15' : 'fill-brand-800'}
        />
        <path
          d="M20 14.6c1.6-2.6 5.9-2 5.9 1.4 0 2.6-3.3 5-5.9 6.9-2.6-1.9-5.9-4.3-5.9-6.9 0-3.4 4.3-4 5.9-1.4z"
          className="fill-accent-500"
        />
      </svg>
      <span
        className={cn(
          'font-heading text-lg font-bold leading-none tracking-tight',
          invert ? 'text-white' : 'text-brand-900',
        )}
      >
        Entrust&nbsp;United
      </span>
    </span>
  );
}
