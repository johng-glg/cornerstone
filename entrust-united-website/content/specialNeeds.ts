import type { Feature, FaqItem } from './types';

export const specialNeedsContent = {
  meta: {
    title: 'Special-Needs Care & Trusts | Entrust United',
    description:
      'A gentle, family-facing overview of pooled and third-party special-needs trusts, custodial administration, and our lifetime-care vision for special-needs individuals.',
    path: '/special-needs',
  },

  hero: {
    eyebrow: 'For special-needs families',
    heading: 'Care that lasts a lifetime',
    subheading:
      'Planning for a loved one with special needs means thinking far beyond today. We help families understand special-needs trusts and provide custodial administration — as part of a long-term, mission-driven commitment to care.',
    primaryCta: { label: 'Talk to us', href: '/contact' },
    secondaryCta: { label: 'Support this work', href: '/donate' },
  },

  intro: {
    heading: 'A partner for the long road',
    body: [
      'Families caring for a special-needs individual carry a unique worry: what happens when I’m no longer here to help? Entrust United exists, in part, to answer that question with a durable, mission-aligned partner.',
      'Below is a plain-language overview of the tools commonly used to plan for lifelong care. This is general information, not legal or financial advice — every family’s situation is different, and important decisions should be made with qualified professionals.',
    ],
  },

  trustTypes: [
    {
      icon: 'users',
      title: 'Pooled special-needs trusts',
      body:
        'A pooled trust combines the resources of many beneficiaries for investment and administration, while keeping a separate sub-account for each person. This can make professional trust administration accessible to more families. [CONFIRM details with counsel — keep general.]',
    },
    {
      icon: 'shield',
      title: 'Third-party special-needs trusts',
      body:
        'A third-party trust is funded with assets that never belonged to the beneficiary — often by parents or grandparents — to provide for a loved one without disrupting their eligibility for needs-based benefits. [CONFIRM details with counsel — keep general.]',
    },
    {
      icon: 'lifeBuoy',
      title: 'Custodial administration',
      body:
        'Beyond the trust itself, day-to-day administration matters: safeguarding funds, keeping records, and coordinating care. We provide custodial administration designed around the individual’s needs.',
    },
  ] satisfies Feature[],

  vision: {
    heading: 'Our lifetime-care vision',
    body:
      'Our goal is care that is planned, funded, and coordinated for the whole of a person’s life — financed by the nonprofit’s mission activities so that families gain support rather than another expense. We’re building toward purpose-built care that treats each special-needs individual as a person, not a case number.',
  },

  reassurance:
    'This page is general information and not legal, tax, or financial advice. We’ll always encourage you to work with qualified professionals on decisions about trusts and benefits.',

  faqs: [
    {
      q: 'Will a special-needs trust affect government benefits?',
      a: 'Trusts are often used specifically to provide for a loved one without disrupting needs-based benefit eligibility, but the rules are detailed and fact-specific. Please consult a qualified attorney. [CONFIRM — keep general, no legal advice.]',
    },
    {
      q: 'What’s the difference between a pooled and a third-party trust?',
      a: 'At a high level, a pooled trust shares investment and administration across many beneficiaries with individual sub-accounts, while a third-party trust is funded by someone other than the beneficiary. The right choice depends on your family’s situation and professional advice.',
    },
    {
      q: 'Do you give legal or financial advice?',
      a: 'No. We provide custodial administration and general information, and we coordinate care. Legal and financial decisions should be made with qualified professionals.',
    },
    {
      q: 'How do we start a conversation?',
      a: 'Reach out through our contact page and we’ll follow up gently to understand your family’s needs. [CONFIRM intake process.]',
    },
  ] satisfies FaqItem[],
};
