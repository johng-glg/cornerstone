import Link from 'next/link';
import { disclosuresContent } from '@content/disclosures';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section } from '@/components/Section';
import { Disclaimer } from '@/components/Disclaimer';

export const metadata = pageMetadata(disclosuresContent.meta);

export default function DisclosuresPage() {
  const c = disclosuresContent;
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} heading={c.hero.heading} subheading={c.hero.subheading} />

      <Section>
        <Disclaimer tone="draft" className="mb-10">
          <strong className="font-semibold">{c.draftBanner}</strong>
        </Disclaimer>

        <div className="grid gap-10 lg:grid-cols-[1fr_3fr]">
          {/* On-page nav */}
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-500">
              On this page
            </h2>
            <ul className="mt-3 space-y-2">
              {c.sections.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`#${s.id}`}
                    className="text-sm text-brand-700 hover:text-accent-700 underline-offset-2 hover:underline"
                  >
                    {s.heading}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {c.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-heading text-2xl font-bold text-brand-900">{s.heading}</h2>
                <div className="mt-4 space-y-4 leading-relaxed text-brand-700">
                  {s.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </section>
            ))}

            <p className="border-t border-brand-100 pt-6 text-sm text-brand-600">{c.contactLine}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
