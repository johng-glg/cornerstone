import { cn } from '@/lib/cn';

/** Constrained, readable text column for prose-heavy sections. */
export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-3xl space-y-4 text-lg leading-relaxed text-brand-700', className)}>
      {children}
    </div>
  );
}
