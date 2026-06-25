import { missionContent } from '@content/mission';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section, SectionHeading } from '@/components/Section';
import { FeatureGrid } from '@/components/FeatureGrid';
import { CTASection } from '@/components/CTASection';
import { Prose } from '@/components/Prose';
import { Icon } from '@/lib/icons';

export const metadata = pageMetadata(missionContent.meta);

export default function MissionPage() {
  const c = missionContent;
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} heading={c.hero.heading} subheading={c.hero.subheading} />

      <Section aria-labelledby="pillars-heading">
        <SectionHeading id="pillars-heading" title="Our two charitable missions" />
        <div className="mt-10">
          <FeatureGrid features={c.pillars} columns={2} />
        </div>
      </Section>

      <Section tone="muted" aria-labelledby="serve-heading">
        <SectionHeading id="serve-heading" eyebrow="Who we serve" title={c.whoWeServe.heading} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {c.whoWeServe.groups.map((g) => (
            <li
              key={g}
              className="flex items-start gap-3 rounded-xl border border-brand-100 bg-white px-5 py-4"
            >
              <Icon name="badgeCheck" className="mt-0.5 h-5 w-5 flex-none text-accent-600" />
              <span className="text-brand-800">{g}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="why-heading">
        <SectionHeading id="why-heading" eyebrow="Structure & neutrality" title={c.whyNonprofit.heading} />
        <Prose className="mt-6">
          {c.whyNonprofit.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Prose>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <Icon name="landmark" className="h-7 w-7 text-brand-700" />
            <h3 className="mt-3 font-heading text-lg font-semibold text-brand-900">
              {c.structure.parent.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-700">{c.structure.parent.role}</p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-white p-6">
            <Icon name="building" className="h-7 w-7 text-brand-700" />
            <h3 className="mt-3 font-heading text-lg font-semibold text-brand-900">
              {c.structure.subsidiary.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-700">
              {c.structure.subsidiary.role}
            </p>
          </div>
        </div>
      </Section>

      <CTASection
        heading="Two missions. One organization. Real accountability."
        primary={{ label: 'See our governance', href: '/governance' }}
        secondary={{ label: 'Support the mission', href: '/donate' }}
      />
    </>
  );
}
