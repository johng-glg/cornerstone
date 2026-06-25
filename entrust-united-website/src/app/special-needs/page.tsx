import { specialNeedsContent } from '@content/specialNeeds';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Faq } from '@/components/Faq';
import { CTASection } from '@/components/CTASection';
import { Disclaimer } from '@/components/Disclaimer';
import { Prose } from '@/components/Prose';
import { Icon } from '@/lib/icons';

export const metadata = pageMetadata(specialNeedsContent.meta);

export default function SpecialNeedsPage() {
  const c = specialNeedsContent;
  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        heading={c.hero.heading}
        subheading={c.hero.subheading}
        primaryCta={c.hero.primaryCta}
        secondaryCta={c.hero.secondaryCta}
      />

      <Section aria-labelledby="intro-heading">
        <SectionHeading id="intro-heading" title={c.intro.heading} />
        <Prose className="mt-6">
          {c.intro.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Prose>
      </Section>

      <Section tone="muted" aria-labelledby="trusts-heading">
        <SectionHeading
          id="trusts-heading"
          eyebrow="Planning tools"
          title="Trusts & administration, in plain language"
          intro="A gentle overview of common ways families plan for lifelong care. General information only — not legal or financial advice."
        />
        <div className="mt-10">
          <FeatureGrid features={c.trustTypes} columns={3} />
        </div>
      </Section>

      <Section tone="accentSoft" aria-labelledby="vision-heading">
        <div className="mx-auto max-w-3xl text-center">
          <Icon name="heart" className="mx-auto h-10 w-10 text-accent-600" />
          <h2 id="vision-heading" className="mt-4 font-heading text-3xl font-bold text-brand-900">
            {c.vision.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-brand-700">{c.vision.body}</p>
        </div>
      </Section>

      <Section aria-labelledby="faq-heading">
        <SectionHeading id="faq-heading" eyebrow="Questions" title="Frequently asked" />
        <div className="mt-8">
          <Faq items={c.faqs} />
        </div>
        <Disclaimer className="mt-8">{c.reassurance}</Disclaimer>
      </Section>

      <CTASection
        heading="Let’s plan for a lifetime of care, together"
        body="Reach out and we’ll follow up gently to understand your family’s needs."
        primary={{ label: 'Talk to us', href: '/contact' }}
        secondary={{ label: 'Support this work', href: '/donate' }}
      />
    </>
  );
}
