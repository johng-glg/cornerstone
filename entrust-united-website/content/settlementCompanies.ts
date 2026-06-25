import type { Feature, FaqItem } from './types';

export const settlementCompaniesContent = {
  meta: {
    title: 'For Settlement Companies — A Neutral Custodial Partner | Entrust United',
    description:
      'A neutral, industry-wide custodial payment processing platform with transparent flat pricing and a compliance-first posture — not tied to any single settlement company.',
    path: '/settlement-companies',
  },

  hero: {
    eyebrow: 'For debt-settlement companies',
    heading: 'A neutral custodial partner, not a competitor',
    subheading:
      'Entrust United operates an independent, industry-wide custodial platform. Because we’re a nonprofit tied to no single settlement company, you can offer your clients neutral protection with transparent, predictable pricing.',
    primaryCta: { label: 'Request information', href: '/contact' },
    secondaryCta: { label: 'How it works', href: '/how-it-works' },
  },

  value: [
    {
      icon: 'scale',
      title: 'Genuinely neutral',
      body:
        'We’re not owned by any settlement company. Offering a neutral custodian signals to clients and regulators that funds are handled at arm’s length.',
    },
    {
      icon: 'coins',
      title: 'Transparent flat pricing',
      body:
        'A flat $5/month per consumer — simple to explain, easy to disclose, and the same for every client. No percentage-of-savings model.',
    },
    {
      icon: 'fileCheck',
      title: 'Compliance-first posture',
      body:
        'Segregated, for-the-benefit-of-consumer accounts and a rollout that respects applicable state licensing. [CONFIRM specifics with counsel.]',
    },
    {
      icon: 'landmark',
      title: 'Mission-aligned',
      body:
        'Working with a nonprofit custodian connects your clients’ protection to a broader charitable mission, including lifetime care for special-needs individuals.',
    },
  ] satisfies Feature[],

  posture: {
    heading: 'Our compliance posture',
    points: [
      'Consumer funds are held FBO the consumer in segregated custodial accounts, distinct from operating funds.',
      'Custodial processing is rolled out subject to applicable state licensing and is not yet available in all states.',
      'We do not provide legal, tax, or financial advice to consumers; we hold and administer funds.',
      'Transparent, flat pricing supports clear consumer disclosures.',
    ],
    note: '[CONFIRM all compliance representations with counsel before publishing.]',
  },

  faqs: [
    {
      q: 'Are you tied to a particular settlement company?',
      a: 'No. Entrust United is an independent nonprofit operating an industry-wide custodial platform through its subsidiary, Entrust United Processing LLC. Neutrality is the point.',
    },
    {
      q: 'How is pricing structured?',
      a: 'A flat $5 per consumer per month — the same for every client, with no percentage-of-savings component.',
    },
    {
      q: 'Where can our clients use this?',
      a: 'Custodial processing is being rolled out subject to applicable state licensing and is not yet available in all states. Contact us about specific states. [CONFIRM with counsel.]',
    },
    {
      q: 'How do we get started?',
      a: 'Use the request-information form on our contact page and our team will follow up to discuss onboarding. [CONFIRM intake process.]',
    },
  ] satisfies FaqItem[],
};
