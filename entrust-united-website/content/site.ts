import type { NavLink } from './types';

/**
 * Global site configuration: identity, navigation, contact details, and the
 * compliance disclaimers that appear site-wide. Edit these to update the
 * header, footer, and SEO metadata everywhere at once.
 *
 * Items wrapped in [CONFIRM] / [DRAFT] need real data or attorney review
 * before launch. The README lists every one.
 */

export const site = {
  name: 'Entrust United Corporation',
  shortName: 'Entrust United',
  legalEntity: 'Entrust United Corporation, a Texas nonprofit corporation',
  subsidiary: 'Entrust United Processing LLC',
  tagline: 'Two missions, one organization: protecting people’s money and caring for people’s lives.',
  // Used for canonical URLs, sitemap, and Open Graph. Change to your real domain.
  url: 'https://www.entrustunited.org', // [CONFIRM real domain]
  monthlyFee: '$5/month',

  // ── Contact (placeholders — replace before launch) ──────────────────────
  contact: {
    email: 'info@entrustunited.org', // [CONFIRM public contact email]
    phone: '(000) 000-0000', // [CONFIRM public phone]
    address: {
      line1: '[Street address]', // [CONFIRM mailing address]
      line2: '',
      city: 'Houston',
      state: 'TX',
      zip: '[ZIP]',
    },
    ein: '[EIN — pending]', // [CONFIRM EIN once issued]
  },

  // ── Social links (optional — leave blank to hide) ───────────────────────
  social: {
    linkedin: '', // [CONFIRM]
    facebook: '', // [CONFIRM]
  },
} as const;

/** Primary navigation shown in the header and footer. */
export const primaryNav: NavLink[] = [
  { label: 'Mission', href: '/mission' },
  { label: 'For Consumers', href: '/consumers' },
  { label: 'For Settlement Companies', href: '/settlement-companies' },
  { label: 'Special Needs', href: '/special-needs' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Governance', href: '/governance' },
];

/** Secondary / utility links (footer + mobile menu). */
export const utilityNav: NavLink[] = [
  { label: 'Donate', href: '/donate' },
  { label: 'Contact', href: '/contact' },
  { label: 'Disclosures', href: '/disclosures' },
];

export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'Our Mission',
    links: [
      { label: 'The Dual Mission', href: '/mission' },
      { label: 'Special-Needs Care', href: '/special-needs' },
      { label: 'Governance & Transparency', href: '/governance' },
    ],
  },
  {
    heading: 'Custodial Processing',
    links: [
      { label: 'For Consumers', href: '/consumers' },
      { label: 'For Settlement Companies', href: '/settlement-companies' },
      { label: 'How It Works', href: '/how-it-works' },
    ],
  },
  {
    heading: 'Get Involved',
    links: [
      { label: 'Donate', href: '/donate' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Disclosures', href: '/disclosures' },
    ],
  },
];

// ── Compliance disclaimers (reused across pages) ──────────────────────────
// IMPORTANT: These statements are intentionally cautious. Do not weaken them
// without counsel. See content/disclosures.ts for the full versions.

/** One-line tax-exempt status disclaimer. [CONFIRM with counsel] */
export const taxStatusDisclaimer =
  'Entrust United Corporation is a Texas nonprofit corporation. Our application for ' +
  'recognition of federal tax-exempt status under Section 501(c)(3) is in progress. ' +
  'Contributions may not be tax-deductible until the IRS issues a determination letter.';

/** One-line money-transmission / availability disclaimer. [CONFIRM with counsel] */
export const availabilityDisclaimer =
  'Custodial payment processing is being rolled out subject to applicable state ' +
  'licensing and is not yet available in all states.';

/** Compact footer disclaimer line shown on every page. */
export const footerDisclaimer =
  'Entrust United Corporation is a Texas nonprofit corporation; 501(c)(3) recognition is ' +
  'pending. Nothing on this site is legal, tax, or financial advice. Custodial processing ' +
  'is subject to state licensing and not available in all states.';
