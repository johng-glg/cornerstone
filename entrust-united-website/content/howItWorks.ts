import type { Step } from './types';

export const howItWorksContent = {
  meta: {
    title: 'How It Works — Custodial Fund Protection | Entrust United',
    description:
      'A clear, step-by-step look at how consumer funds flow into segregated custodial accounts held for the consumer’s benefit, separate from operating funds.',
    path: '/how-it-works',
  },

  hero: {
    eyebrow: 'How it works',
    heading: 'Where your money goes — and where it doesn’t',
    subheading:
      'Custodial protection is simple in principle: your money is set aside for you, held separately, and used only as intended. Here’s the flow, step by step.',
  },

  steps: [
    {
      title: 'You set money aside',
      body:
        'As part of your debt-settlement plan, you contribute funds on a schedule. Those contributions are destined for your custodial account — not for us.',
    },
    {
      title: 'Funds enter a segregated custodial account',
      body:
        'Your money is deposited into a custodial account established for-the-benefit-of (FBO) you, kept separate from Entrust United’s own operating funds.',
    },
    {
      title: 'We administer — neutrally',
      body:
        'We safeguard and keep records of your funds for one flat $5/month fee. We don’t negotiate your debts and we don’t give legal or financial advice.',
    },
    {
      title: 'Funds are disbursed as intended',
      body:
        'When a settlement is reached and authorized, funds are released for that purpose. Your money is only ever used the way it’s meant to be. [CONFIRM disbursement/authorization details.]',
    },
  ] satisfies Step[],

  diagram: {
    heading: 'The FBO segregation model',
    caption:
      'Consumer funds flow into segregated custodial accounts held for the consumer’s benefit — kept entirely separate from the organization’s operating funds.',
  },

  reassurance:
    'At every step, the principle is the same: segregated and for your benefit. Your set-aside money is never treated as the platform’s property.',
};
