'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '@content/types';
import { cn } from '@/lib/cn';

/** Accessible FAQ accordion built on native <button> + aria-expanded. */
export function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
              >
                <span className="font-heading text-lg font-semibold text-brand-900">
                  {item.q}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 flex-none text-accent-600 transition-transform motion-reduce:transition-none',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5 -mt-1"
            >
              <p className="leading-relaxed text-brand-700">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
