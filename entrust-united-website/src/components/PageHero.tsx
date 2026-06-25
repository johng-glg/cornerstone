import { Container } from './Container';
import { ButtonLink } from './Button';
import { cn } from '@/lib/cn';

interface Cta {
  label: string;
  href: string;
}

/**
 * Page-level hero. `variant="home"` renders a larger, brand-toned hero;
 * `variant="page"` renders a compact inner-page header.
 */
export function PageHero({
  eyebrow,
  heading,
  subheading,
  primaryCta,
  secondaryCta,
  variant = 'page',
  children,
}: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  variant?: 'home' | 'page';
  children?: React.ReactNode;
}) {
  const isHome = variant === 'home';
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        isHome ? 'bg-brand-800 text-white' : 'bg-brand-50 text-brand-900',
      )}
    >
      {/* Decorative gradient wash (hidden from AT, respects reduced motion via no animation) */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0',
          isHome
            ? 'bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(242,109,24,0.18),transparent)]'
            : 'bg-[radial-gradient(50rem_24rem_at_90%_-20%,rgba(47,111,123,0.12),transparent)]',
        )}
      />
      <Container className={cn('relative', isHome ? 'py-20 sm:py-28 lg:py-32' : 'py-14 sm:py-16 lg:py-20')}>
        <div className="max-w-3xl">
          {eyebrow && (
            <p
              className={cn(
                'mb-4 text-sm font-semibold uppercase tracking-wider',
                isHome ? 'text-accent-300' : 'text-accent-600',
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              'font-heading font-bold leading-[1.1]',
              isHome ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-3xl sm:text-4xl lg:text-5xl',
            )}
          >
            {heading}
          </h1>
          {subheading && (
            <p
              className={cn(
                'mt-6 text-lg leading-relaxed sm:text-xl',
                isHome ? 'text-brand-100' : 'text-brand-700',
              )}
            >
              {subheading}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {primaryCta && (
                <ButtonLink href={primaryCta.href} variant="primary" withArrow>
                  {primaryCta.label}
                </ButtonLink>
              )}
              {secondaryCta && (
                <ButtonLink
                  href={secondaryCta.href}
                  variant={isHome ? 'onBrand' : 'ghost'}
                >
                  {secondaryCta.label}
                </ButtonLink>
              )}
            </div>
          )}
          {children}
        </div>
      </Container>
    </div>
  );
}
