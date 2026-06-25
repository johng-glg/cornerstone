import { settlementCompaniesContent } from '@content/settlementCompanies';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Faq } from '@/components/Faq';
import { CTASection } from '@/components/CTASection';
import { Disclaimer } from '@/components/Disclaimer';
import { Icon } from '@/lib/icons';

export const metadata = pageMetadata(settlementCompaniesContent.meta);

export default function SettlementCompaniesPage() {
  const c = settlementCompaniesContent;
  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        heading={c.hero.heading}
        subheading={c.hero.subheading}
        primaryCta={c.hero.primaryCta}
        secondaryCta={c.hero.secondaryCta}
      />

      <Section aria-labelledby="value-heading">
        <SectionHeading
          id="value-heading"
          eyebrow="Why partner with us"
          title="A custodial partner built on neutrality"
        />
        <div className="mt-10">
          <FeatureGrid features={c.value} columns={2} />
        </div>
      </Section>

      <Section tone="muted" aria-labelledby="posture-heading">
        <SectionHeading id="posture-heading" title={c.posture.heading} />
        <ul className="mt-8 space-y-3">
          {c.posture.points.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-xl border border-brand-100 bg-white px-5 py-4"
            >
              <Icon name="fileCheck" className="mt-0.5 h-5 w-5 flex-none text-accent-600" />
              <span className="text-brand-800">{p}</span>
            </li>
          ))}
        </ul>
        <Disclaimer tone="draft" className="mt-8">
          {c.posture.note}
        </Disclaimer>
      </Section>

      <Section aria-labelledby="faq-heading">
        <SectionHeading id="faq-heading" eyebrow="Questions" title="Frequently asked" />
        <div className="mt-8">
          <Faq items={c.faqs} />
        </div>
      </Section>

      <CTASection
        heading="Let’s talk about a neutral custodial partnership"
        body="Tell us about your firm and we’ll follow up with details on onboarding."
        primary={{ label: 'Request information', href: '/contact' }}
        secondary={{ label: 'How it works', href: '/how-it-works' }}
      />
    </>
  );
}
