import { howItWorksContent } from '@content/howItWorks';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { Stepper } from '@/components/Stepper';
import { FboDiagram } from '@/components/FboDiagram';
import { CTASection } from '@/components/CTASection';
import { Disclaimer } from '@/components/Disclaimer';

export const metadata = pageMetadata(howItWorksContent.meta);

export default function HowItWorksPage() {
  const c = howItWorksContent;
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} heading={c.hero.heading} subheading={c.hero.subheading} />

      <Section aria-labelledby="steps-heading">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading id="steps-heading" eyebrow="Step by step" title="The flow of your funds" />
            <div className="mt-8">
              <Stepper steps={c.steps} />
            </div>
          </div>

          {/* FBO segregation diagram */}
          <div className="lg:sticky lg:top-24">
            <h2 className="font-heading text-2xl font-bold text-brand-900">{c.diagram.heading}</h2>
            <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-7">
              <FboDiagram />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-brand-600">{c.diagram.caption}</p>
          </div>
        </div>

        <Disclaimer className="mt-12">{c.reassurance}</Disclaimer>
      </Section>

      <CTASection
        heading="See it in action"
        body="Questions about how your money flows? We’ll walk you through it."
        primary={{ label: 'Contact us', href: '/contact' }}
        secondary={{ label: 'For consumers', href: '/consumers' }}
      />
    </>
  );
}
