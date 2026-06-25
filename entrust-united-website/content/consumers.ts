import type { Feature, FaqItem } from './types';

export const consumersContent = {
  meta: {
    title: 'For Consumers — Your Money, Protected | Entrust United',
    description:
      'If you’re enrolled in debt settlement, learn how Entrust United holds your money for your benefit in segregated custodial accounts for a flat $5/month.',
    path: '/consumers',
  },

  hero: {
    eyebrow: 'For consumers & families',
    heading: 'Your money stays yours',
    subheading:
      'When you’re working your way out of debt, the last thing you should worry about is whether your set-aside money is safe. We hold it for your benefit — neutrally, transparently, and for one small flat fee.',
    primaryCta: { label: 'Contact us', href: '/contact' },
    secondaryCta: { label: 'See how it works', href: '/how-it-works' },
  },

  protections: [
    {
      icon: 'lock',
      title: 'Held for your benefit (FBO)',
      body:
        'Your funds sit in a segregated custodial account established for-the-benefit-of you. They are not our property and are kept separate from our operating money.',
    },
    {
      icon: 'coins',
      title: 'One flat fee — $5/month',
      body:
        'The same small, transparent fee for everyone — not a percentage of what you save. You always know what you’re paying.',
    },
    {
      icon: 'scale',
      title: 'A neutral third party',
      body:
        'We aren’t owned by a settlement company. We hold your funds fairly, no matter which company you’re working with.',
    },
    {
      icon: 'eye',
      title: 'Transparency you can check',
      body:
        'Clear records of what you’ve set aside. You should always be able to see where your money is. [CONFIRM portal/statement details]',
    },
  ] satisfies Feature[],

  // Plain-language explainer of FBO / segregated custody.
  fboExplainer: {
    heading: 'What “segregated, for-your-benefit” actually means',
    plain: [
      'Segregated means your money is kept in a separate account — not mixed in with the company’s own funds.',
      'For-the-benefit-of (FBO) means the account is legally set up for you. We administer it, but it isn’t ours to spend.',
      'Together, this is the same custodial principle used to safeguard funds elsewhere in financial services: your money is protected and traceable.',
    ],
  },

  whatWeAre: {
    heading: 'What we are — and what we aren’t',
    are: [
      'We hold and administer your set-aside funds in a custodial account.',
      'We keep your money segregated and for your benefit.',
      'We charge one flat, transparent fee.',
    ],
    arent: [
      'We do not give legal, tax, or financial advice.',
      'We are not your debt-settlement company and do not negotiate your debts.',
      'We do not promise any particular settlement outcome or savings.',
    ],
  },

  faqs: [
    {
      q: 'Is my money safe with Entrust United?',
      a: 'Your funds are held in a segregated custodial account for your benefit, kept separate from our operating funds. They remain associated with you, not us. [CONFIRM specific safeguards/insurance language with counsel.]',
    },
    {
      q: 'How much does it cost?',
      a: 'A flat $5 per month — the same for everyone, regardless of how much you set aside. It is not a percentage of your savings.',
    },
    {
      q: 'Do you decide how my debts are settled?',
      a: 'No. We are a neutral custodian that holds your funds. Your debt-settlement company handles negotiations; we do not give legal or financial advice.',
    },
    {
      q: 'Is this available where I live?',
      a: 'Custodial payment processing is being rolled out subject to applicable state licensing and is not yet available in all states. Contact us to ask about your state. [CONFIRM with counsel]',
    },
    {
      q: 'Can I see my balance?',
      a: 'You should always be able to see what you’ve set aside. [CONFIRM statement/portal details before launch.]',
    },
  ] satisfies FaqItem[],
};
