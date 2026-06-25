import { donateContent } from '@content/donate';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Disclaimer } from '@/components/Disclaimer';
import { ButtonLink } from '@/components/Button';
import { Heart } from 'lucide-react';

export const metadata = pageMetadata(donateContent.meta);

export default function DonatePage() {
  const c = donateContent;
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} heading={c.hero.heading} subheading={c.hero.subheading} />

      {/* Placeholder donation CTA */}
      <Section aria-labelledby="give-heading">
        <div className="mx-auto max-w-2xl rounded-2xl border border-accent-200 bg-accent-50 p-8 text-center sm:p-10">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-white">
            <Heart className="h-7 w-7" aria-hidden />
          </span>
          <h2 id="give-heading" className="mt-5 font-heading text-3xl font-bold text-brand-900">
            {c.donationCta.heading}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-brand-700">{c.donationCta.body}</p>
          <div className="mt-7">
            <ButtonLink href={c.donationCta.buttonHref} variant="primary" withArrow>
              {c.donationCta.buttonLabel}
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs text-brand-500">{c.donationCta.note}</p>
        </div>

        {/* Tax-deductibility disclaimer */}
        <div className="mx-auto mt-8 max-w-2xl">
          <Disclaimer tone="draft">{c.taxNotice}</Disclaimer>
        </div>
      </Section>

      <Section tone="muted" aria-labelledby="ways-heading">
        <SectionHeading
          id="ways-heading"
          eyebrow="Ways to help"
          title="More than one way to make a difference"
        />
        <div className="mt-10">
          <FeatureGrid features={c.waysToHelp} columns={3} />
        </div>
      </Section>
    </>
  );
}
