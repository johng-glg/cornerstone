import { consumersContent } from '@content/consumers';
import { availabilityDisclaimer } from '@content/site';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Faq } from '@/components/Faq';
import { CTASection } from '@/components/CTASection';
import { Disclaimer } from '@/components/Disclaimer';
import { Icon } from '@/lib/icons';
import { Check, X } from 'lucide-react';

export const metadata = pageMetadata(consumersContent.meta);

export default function ConsumersPage() {
  const c = consumersContent;
  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        heading={c.hero.heading}
        subheading={c.hero.subheading}
        primaryCta={c.hero.primaryCta}
        secondaryCta={c.hero.secondaryCta}
      />

      <Section aria-labelledby="protections-heading">
        <SectionHeading
          id="protections-heading"
          eyebrow="Your protections"
          title="How we keep your money safe"
        />
        <div className="mt-10">
          <FeatureGrid features={c.protections} columns={2} />
        </div>
      </Section>

      {/* Plain-language FBO explainer */}
      <Section tone="muted" aria-labelledby="fbo-heading">
        <SectionHeading id="fbo-heading" title={c.fboExplainer.heading} />
        <ol className="mt-8 space-y-4">
          {c.fboExplainer.plain.map((line, i) => (
            <li key={line} className="flex gap-4 rounded-xl border border-brand-100 bg-white p-5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-100 font-heading font-bold text-accent-700">
                {i + 1}
              </span>
              <p className="leading-relaxed text-brand-800">{line}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* What we are / aren't */}
      <Section aria-labelledby="scope-heading">
        <SectionHeading id="scope-heading" title={c.whatWeAre.heading} />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <h3 className="font-heading text-lg font-semibold text-brand-900">What we are</h3>
            <ul className="mt-4 space-y-3">
              {c.whatWeAre.are.map((item) => (
                <li key={item} className="flex items-start gap-3 text-brand-800">
                  <Check className="mt-0.5 h-5 w-5 flex-none text-brand-600" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-white p-6">
            <h3 className="font-heading text-lg font-semibold text-brand-900">What we aren’t</h3>
            <ul className="mt-4 space-y-3">
              {c.whatWeAre.arent.map((item) => (
                <li key={item} className="flex items-start gap-3 text-brand-800">
                  <X className="mt-0.5 h-5 w-5 flex-none text-accent-600" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Disclaimer className="mt-8">{availabilityDisclaimer}</Disclaimer>
      </Section>

      {/* FAQ */}
      <Section tone="muted" aria-labelledby="faq-heading">
        <SectionHeading id="faq-heading" eyebrow="Questions" title="Frequently asked" />
        <div className="mt-8 flex items-center gap-3 text-brand-700">
          <Icon name="lifeBuoy" className="h-5 w-5 text-accent-600" />
          <span className="text-sm">Still unsure? Reach out — we’re happy to explain.</span>
        </div>
        <div className="mt-6">
          <Faq items={c.faqs} />
        </div>
      </Section>

      <CTASection
        heading="Have questions about your money?"
        body="We’ll explain exactly how your funds are protected — in plain language."
        primary={{ label: 'Contact us', href: '/contact' }}
        secondary={{ label: 'See how it works', href: '/how-it-works' }}
      />
    </>
  );
}
