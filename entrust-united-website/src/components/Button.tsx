import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'onBrand';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-semibold ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-accent-500 disabled:opacity-60';

const variants: Record<Variant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700',
  secondary: 'bg-brand-800 text-white hover:bg-brand-900',
  ghost:
    'border border-brand-300 bg-white text-brand-800 hover:bg-brand-50',
  onBrand:
    'bg-white text-brand-900 hover:bg-brand-50 focus-visible:ring-offset-brand-800',
};

/** Link styled as a button. Use for navigational CTAs. */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  withArrow = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  withArrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
      {withArrow && <ArrowRight className="h-4 w-4" aria-hidden />}
    </Link>
  );
}
