import type { Feature } from './types';

export const governanceContent = {
  meta: {
    title: 'Governance & Transparency | Entrust United',
    description:
      'Entrust United is a board-governed Texas nonprofit with an independent-director majority, a conflict-of-interest policy, and a commitment to transparency.',
    path: '/governance',
  },

  hero: {
    eyebrow: 'Governance & transparency',
    heading: 'Accountable by design',
    subheading:
      'An organization that holds people’s money should be able to show how it’s governed. Entrust United is built around independent oversight, clear policies, and a commitment to transparency.',
  },

  principles: [
    {
      icon: 'landmark',
      title: 'Board-governed, no members',
      body:
        'Entrust United Corporation is a Texas nonprofit corporation governed by a board of directors, structured without voting members so that fiduciary oversight rests with the board. [CONFIRM structure with counsel.]',
    },
    {
      icon: 'scale',
      title: 'Independent-director majority',
      body:
        'A majority of independent directors is intended to keep decision-making at arm’s length from any single interest, reinforcing the platform’s neutrality. [CONFIRM.]',
    },
    {
      icon: 'fileCheck',
      title: 'Conflict-of-interest policy',
      body:
        'A written conflict-of-interest policy governs how directors and officers disclose and manage potential conflicts. [DRAFT — attorney review required.]',
    },
    {
      icon: 'eye',
      title: 'Transparency commitment',
      body:
        'We intend to publish governance documents and financial disclosures as the organization matures and obtains its determination letter. [CONFIRM what/when with counsel.]',
    },
  ] satisfies Feature[],

  board: {
    heading: 'Board of directors',
    placeholder:
      'Board roster to be published. [CONFIRM names, roles, and independence designations before launch.]',
    // Replace with real directors. Mark each as Independent / Non-independent.
    members: [
      { name: '[Director name]', role: 'Chair', independent: true },
      { name: '[Director name]', role: 'Director', independent: true },
      { name: '[Director name]', role: 'Director', independent: true },
      { name: '[Director name]', role: 'Director', independent: false },
    ],
  },

  disclosuresTeaser: {
    heading: 'Financial transparency',
    body:
      'As a nonprofit pursuing 501(c)(3) recognition, we are committed to appropriate financial disclosure over time. Specific filings and reports will be posted here as they become available. [CONFIRM disclosure plan with counsel.]',
  },
};
