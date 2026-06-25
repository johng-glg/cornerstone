import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { AudienceCard } from '@content/types';
import { Icon } from '@/lib/icons';

/** Audience-segmented entry points (Consumers / Companies / Families / Donors). */
export function AudienceCards({ cards }: { cards: AudienceCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <li key={c.audience}>
          <Link
            href={c.cta.href}
            className="group flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 transition-colors hover:border-accent-300 hover:bg-accent-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-800 text-white">
              <Icon name={c.icon} className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold text-brand-900">
              {c.audience}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-700">{c.body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700">
              {c.cta.label}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
