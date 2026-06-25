import type { AudienceCard, Feature, Stat } from './types';

export const homeContent = {
  meta: {
    title: 'Entrust United Corporation — Custodial Protection & Lifetime Care',
    description:
      'A Texas nonprofit with a dual mission: protecting consumer funds in debt settlement through neutral custodial processing, and funding lifetime care for special-needs individuals.',
    path: '/',
  },

  hero: {
    eyebrow: 'A nonprofit built on trust',
    heading: 'Protecting people’s money. Caring for people’s lives.',
    subheading:
      'Entrust United Corporation is a Texas nonprofit with two missions that share one purpose — putting people first. We hold consumer funds safely and neutrally during debt settlement, and we fund lifetime care for special-needs individuals.',
    primaryCta: { label: 'See how your money is protected', href: '/consumers' },
    secondaryCta: { label: 'Explore our mission', href: '/mission' },
  },

  // "Two missions, one organization" split.
  missions: [
    {
      icon: 'shield' as const,
      title: 'Consumer financial protection',
      body:
        'A neutral, third-party custodial platform for the debt-settlement industry. Your money is held for your benefit in segregated accounts — never ours — for one flat, transparent fee.',
      cta: { label: 'For consumers', href: '/consumers' },
    },
    {
      icon: 'heart' as const,
      title: 'Lifetime care for special needs',
      body:
        'We fund and coordinate special-needs trusts, custodial administration, and purpose-built care — financed by our mission activities, not by the families we serve.',
      cta: { label: 'For special-needs families', href: '/special-needs' },
    },
  ],

  // The $5/month flat-fee value proposition + trust signals.
  trustSignals: [
    {
      icon: 'coins' as const,
      title: 'One flat fee — $5/month',
      body:
        'The same tiny, transparent fee for everyone. No percentage-of-savings pricing, no surprises — unlike many for-profit processors.',
    },
    {
      icon: 'lock' as const,
      title: 'Segregated, for-your-benefit funds',
      body:
        'Consumer money is held FBO (for-the-benefit-of) you in segregated custodial accounts, kept separate from our operating funds.',
    },
    {
      icon: 'scale' as const,
      title: 'Neutral and independent',
      body:
        'We are not owned by, or tied to, any single settlement company. Our only job is to hold funds fairly.',
    },
    {
      icon: 'landmark' as const,
      title: 'Nonprofit by design',
      body:
        'A board-governed Texas nonprofit. Surplus advances our mission — it does not enrich shareholders.',
    },
  ] satisfies Feature[],

  stats: [
    { value: '$5', label: 'Flat monthly fee — the same for everyone' },
    { value: '100%', label: 'Of consumer funds held for the consumer’s benefit' },
    { value: '2', label: 'Charitable missions, one accountable organization' },
  ] satisfies Stat[],

  // Audience-segmented entry points.
  audiences: [
    {
      icon: 'wallet',
      audience: 'Consumers & families',
      body: 'Enrolled in debt settlement? Learn how your money stays protected and yours.',
      cta: { label: 'Protect my money', href: '/consumers' },
    },
    {
      icon: 'building',
      audience: 'Settlement companies',
      body: 'A neutral, industry-wide custodial partner with transparent flat pricing.',
      cta: { label: 'Request information', href: '/settlement-companies' },
    },
    {
      icon: 'heart',
      audience: 'Special-needs families',
      body: 'Explore special-needs trusts, custodial administration, and lifetime care.',
      cta: { label: 'Talk to us', href: '/special-needs' },
    },
    {
      icon: 'handshake',
      audience: 'Donors & partners',
      body: 'Support a mission that protects vulnerable people and funds lifelong care.',
      cta: { label: 'Support the mission', href: '/donate' },
    },
  ] satisfies AudienceCard[],

  governanceTeaser: {
    heading: 'Built to be trusted — and to prove it',
    body:
      'Entrust United is governed by an independent board, with a conflict-of-interest policy and a commitment to transparency. As a nonprofit handling people’s money, accountability isn’t a feature — it’s the foundation.',
    cta: { label: 'See our governance', href: '/governance' },
  },
};
