import { cn } from '@/lib/cn';

/** Centered max-width wrapper with responsive horizontal padding. */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-content px-5 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
