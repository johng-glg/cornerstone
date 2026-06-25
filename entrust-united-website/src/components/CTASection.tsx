import { Section } from './Section';
import { ButtonLink } from './Button';

/** Audience CTA band — used at the foot of most pages. */
export function CTASection({
  heading,
  body,
  primary,
  secondary,
}: {
  heading: string;
  body?: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <Section tone="brand">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-bold sm:text-4xl">{heading}</h2>
        {body && <p className="mt-4 text-lg leading-relaxed text-brand-100">{body}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href={primary.href} variant="primary" withArrow>
            {primary.label}
          </ButtonLink>
          {secondary && (
            <ButtonLink href={secondary.href} variant="onBrand">
              {secondary.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </Section>
  );
}
