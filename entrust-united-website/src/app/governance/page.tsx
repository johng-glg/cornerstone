import { governanceContent } from '@content/governance';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { FeatureGrid } from '@/components/FeatureGrid';
import { CTASection } from '@/components/CTASection';
import { Disclaimer } from '@/components/Disclaimer';
import { cn } from '@/lib/cn';

export const metadata = pageMetadata(governanceContent.meta);

export default function GovernancePage() {
  const c = governanceContent;
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} heading={c.hero.heading} subheading={c.hero.subheading} />

      <Section aria-labelledby="principles-heading">
        <SectionHeading
          id="principles-heading"
          eyebrow="How we’re governed"
          title="Independent oversight, clear policies"
        />
        <div className="mt-10">
          <FeatureGrid features={c.principles} columns={2} />
        </div>
      </Section>

      {/* Board roster */}
      <Section tone="muted" aria-labelledby="board-heading">
        <SectionHeading id="board-heading" title={c.board.heading} />
        <Disclaimer tone="draft" className="mt-6">
          {c.board.placeholder}
        </Disclaimer>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.board.members.map((m, i) => (
            <li key={i} className="rounded-2xl border border-brand-100 bg-white p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-heading text-lg font-bold text-brand-700">
                {/* Initial placeholder avatar */}
                {m.name.replace(/[^A-Za-z]/g, '').charAt(0) || '—'}
              </div>
              <p className="mt-4 font-semibold text-brand-900">{m.name}</p>
              <p className="text-sm text-brand-600">{m.role}</p>
              <span
                className={cn(
                  'mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                  m.independent
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-accent-100 text-accent-800',
                )}
              >
                {m.independent ? 'Independent' : 'Non-independent'}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Financial transparency */}
      <Section aria-labelledby="disclosure-heading">
        <SectionHeading id="disclosure-heading" title={c.disclosuresTeaser.heading} />
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-brand-700">
          {c.disclosuresTeaser.body}
        </p>
      </Section>

      <CTASection
        heading="Transparency you can hold us to"
        body="Read our full disclosures, or get in touch with governance questions."
        primary={{ label: 'View disclosures', href: '/disclosures' }}
        secondary={{ label: 'Contact us', href: '/contact' }}
      />
    </>
  );
}
