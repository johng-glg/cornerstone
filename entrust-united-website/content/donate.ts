import { taxStatusDisclaimer } from './site';
import type { Feature } from './types';

export const donateContent = {
  meta: {
    title: 'Support the Mission | Entrust United',
    description:
      'Support a nonprofit that protects consumer funds and funds lifetime care for special-needs individuals. Learn about giving and partnership.',
    path: '/donate',
  },

  hero: {
    eyebrow: 'Support our mission',
    heading: 'Help us protect people — and care for them for life',
    subheading:
      'Your support advances two missions at once: safeguarding the money of consumers working out of debt, and funding lifetime care for special-needs individuals.',
  },

  // Placeholder CTA only — no live payment integration.
  donationCta: {
    heading: 'Make a gift',
    body:
      'Online giving is coming soon. In the meantime, contact us to discuss how you’d like to support the mission.',
    buttonLabel: 'Contact us to give',
    buttonHref: '/contact',
    note: '[CONFIRM/REPLACE: wire to a real, vetted donation provider before launch.]',
  },

  taxNotice: taxStatusDisclaimer,

  waysToHelp: [
    {
      icon: 'heart',
      title: 'Give',
      body:
        'One-time or recurring gifts directly support our charitable mission, including lifetime care for special-needs individuals.',
    },
    {
      icon: 'handshake',
      title: 'Partner',
      body:
        'Organizations and settlement companies can partner with us to extend neutral custodial protection and mission impact.',
    },
    {
      icon: 'users',
      title: 'Spread the word',
      body:
        'Help families and consumers learn that a neutral, nonprofit option exists. Awareness is its own form of support.',
    },
  ] satisfies Feature[],
};
