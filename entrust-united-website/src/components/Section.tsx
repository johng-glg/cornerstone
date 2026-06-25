import { cn } from '@/lib/cn';
import { Container } from './Container';

type Tone = 'default' | 'muted' | 'brand' | 'accentSoft';

const toneClasses: Record<Tone, string> = {
  default: 'bg-white text-brand-900',
  muted: 'bg-brand-50 text-brand-900',
  brand: 'bg-brand-800 text-white',
  accentSoft: 'bg-accent-50 text-brand-900',
};

/** A vertical page section with consistent spacing and optional background tone. */
export function Section({
  children,
  tone = 'default',
  className,
  containerClassName,
  id,
  'aria-labelledby': ariaLabelledby,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  containerClassName?: string;
  id?: string;
  'aria-labelledby'?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={cn('py-16 sm:py-20 lg:py-24', toneClasses[tone], className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

/** Standard section heading block (eyebrow + title + optional intro). */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  id,
  align = 'left',
  invert = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  id?: string;
  align?: 'left' | 'center';
  invert?: boolean;
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && (
        <p
          className={cn(
            'mb-3 text-sm font-semibold uppercase tracking-wider',
            invert ? 'text-accent-300' : 'text-accent-600',
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className={cn(
          'font-heading text-3xl font-bold leading-tight sm:text-4xl',
          invert ? 'text-white' : 'text-brand-900',
        )}
      >
        {title}
      </h2>
      {intro && (
        <p className={cn('mt-4 text-lg leading-relaxed', invert ? 'text-brand-100' : 'text-brand-700')}>
          {intro}
        </p>
      )}
    </div>
  );
}
