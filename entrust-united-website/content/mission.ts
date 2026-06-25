import type { Feature } from './types';

export const missionContent = {
  meta: {
    title: 'Our Mission — Entrust United Corporation',
    description:
      'Two charitable missions, one organization: neutral custodial protection of consumer funds in debt settlement, and lifetime care for special-needs individuals.',
    path: '/mission',
  },

  hero: {
    eyebrow: 'Why we exist',
    heading: 'Two missions, one organization',
    subheading:
      'Entrust United Corporation exists to protect people who are easy to overlook — consumers working their way out of debt, and individuals who will need care for their whole lives. A nonprofit structure lets us serve both without competing interests.',
  },

  pillars: [
    {
      icon: 'shield',
      title: 'Consumer financial protection',
      body:
        'We operate a neutral, third-party custodial payment processing platform for the debt-settlement industry. When a consumer sets aside money toward settling their debts, those funds are held FBO (for-the-benefit-of) the consumer in segregated custodial accounts — never the platform’s property. A single flat fee of $5/month keeps the model transparent and the same for everyone.',
    },
    {
      icon: 'heart',
      title: 'Lifetime care for special-needs individuals',
      body:
        'We fund and coordinate special-needs trusts, custodial administration, and purpose-built care for special-needs individuals (SNIs). This lifetime-care work is financed by the nonprofit’s mission activities — so that families gain a durable, mission-aligned partner rather than another bill.',
    },
  ] satisfies Feature[],

  whoWeServe: {
    heading: 'Who we serve',
    groups: [
      'Consumers and families enrolled in debt settlement who want their money protected.',
      'Debt-settlement companies seeking a neutral, transparent processing partner.',
      'Special-needs families exploring pooled and third-party special-needs trusts and lifetime care.',
      'Donors and partners who want to support the mission.',
      'Regulators and members of the public looking for governance and transparency.',
    ],
  },

  whyNonprofit: {
    heading: 'Why a nonprofit structure matters',
    body: [
      'Neutrality requires independence. A for-profit processor owned by, or paid as a percentage of, a settlement company has incentives that may not align with the consumer. As an independent nonprofit, our incentive is simple: hold funds fairly and advance our mission.',
      'The custodial platform is operated through a single-member subsidiary, Entrust United Processing LLC. The Corporation is the mission-driven parent; the platform is how that mission is delivered. Surplus from mission activities supports lifetime care — it is not distributed to shareholders.',
    ],
  },

  // Organizational structure note (parent + subsidiary).
  structure: {
    heading: 'How we’re organized',
    parent: {
      name: 'Entrust United Corporation',
      role: 'Mission-driven Texas nonprofit parent. Board-governed; pursuing 501(c)(3) recognition.',
    },
    subsidiary: {
      name: 'Entrust United Processing LLC',
      role: 'Single-member subsidiary that operates the custodial payment processing platform.',
    },
  },
};
