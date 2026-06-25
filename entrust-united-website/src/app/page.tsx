import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { homeContent } from '@content/home';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { FeatureGrid } from '@/components/FeatureGrid';
import { StatBand } from '@/components/StatBand';
import { AudienceCards } from '@/components/AudienceCards';
import { CTASection } from '@/components/CTASection';
import { Icon } from '@/lib/icons';
import { OrganizationJsonLd } from '@/components/JsonLd';

export const metadata = pageMetadata(homeContent.meta);

export default function HomePage() {
  const c = homeContent;
  return (
    <>
      <OrganizationJsonLd />

      <PageHero
        variant="home"
        eyebrow={c.hero.eyebrow}
        heading={c.hero.heading}
        subheading={c.hero.subheading}
        primaryCta={c.hero.primaryCta}
        secondaryCta={c.hero.secondaryCta}
      />

      {/* Two missions, one organization */}
      <Section tone="default" aria-labelledby="missions-heading">
        <SectionHeading
          id="missions-heading"
          eyebrow="Two missions, one organization"
          title="One purpose: putting people first"
          intro="Everything we do flows from a single belief — that vulnerable people deserve a trustworthy steward, whether they’re protecting their money or planning a lifetime of care."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {c.missions.map((m) => (
            <div
              key={m.title}
              className="flex flex-col rounded-2xl border border-brand-100 bg-brand-50 p-8"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-800 text-white">
                <Icon name={m.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-heading text-2xl font-bold text-brand-900">{m.title}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-brand-700">{m.body}</p>
              <Link
                href={m.cta.href}
                className="mt-5 inline-flex items-center gap-1.5 font-semibold text-accent-700 hover:text-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
              >
                {m.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* Stats band */}
      <Section tone="brand" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          By the numbers
        </h2>
        <StatBand stats={c.stats} />
      </Section>

      {/* Trust signals + flat fee value prop */}
      <Section tone="muted" aria-labelledby="trust-heading">
        <SectionHeading
          id="trust-heading"
          eyebrow="Why people trust us"
          title="Protection you can actually verify"
          intro="No fine print, no percentage games. Just a transparent, neutral, nonprofit custodian doing one job well."
        />
        <div className="mt-12">
          <FeatureGrid features={c.trustSignals} columns={4} />
        </div>
      </Section>

      {/* Audience-segmented entry points */}
      <Section tone="default" aria-labelledby="audiences-heading">
        <SectionHeading
          id="audiences-heading"
          eyebrow="Find your path"
          title="Where would you like to start?"
        />
        <div className="mt-12">
          <AudienceCards cards={c.audiences} />
        </div>
      </Section>

      {/* Governance teaser */}
      <Section tone="accentSoft" aria-labelledby="gov-teaser-heading">
        <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading
              id="gov-teaser-heading"
              eyebrow="Accountability first"
              title={c.governanceTeaser.heading}
              intro={c.governanceTeaser.body}
            />
            <div className="mt-6">
              <Link
                href={c.governanceTeaser.cta.href}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-800 px-5 py-3 font-semibold text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500"
              >
                {c.governanceTeaser.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <ul className="space-y-3" aria-label="Governance highlights">
            {['Independent board oversight', 'Conflict-of-interest policy', 'Transparency commitment'].map(
              (item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-brand-200 bg-white px-4 py-3"
                >
                  <Icon name="badgeCheck" className="h-5 w-5 flex-none text-accent-600" />
                  <span className="font-medium text-brand-800">{item}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      </Section>

      <CTASection
        heading="Ready to protect what matters?"
        body="Whether you’re safeguarding your money or planning a lifetime of care, we’re here to help."
        primary={{ label: 'For consumers', href: '/consumers' }}
        secondary={{ label: 'Support the mission', href: '/donate' }}
      />
    </>
  );
}
