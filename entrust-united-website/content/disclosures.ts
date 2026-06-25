import { availabilityDisclaimer, taxStatusDisclaimer } from './site';

/**
 * Full legal / disclosure copy. ALL of this is placeholder and must be
 * reviewed and finalized by counsel before launch. Marked [DRAFT — attorney
 * review required] in the UI.
 */
export const disclosuresContent = {
  meta: {
    title: 'Disclosures, Privacy & Terms | Entrust United',
    description:
      'Legal disclosures, tax-status and availability statements, privacy policy, and terms of use for Entrust United Corporation. Draft — pending attorney review.',
    path: '/disclosures',
  },

  hero: {
    eyebrow: 'Disclosures',
    heading: 'Disclosures, privacy & terms',
    subheading:
      'Transparency includes being clear about our status and limits. The statements below are drafts pending attorney review.',
  },

  draftBanner:
    'DRAFT — attorney review required. The content on this page is placeholder language and must be finalized by counsel before this site goes live.',

  sections: [
    {
      id: 'tax-status',
      heading: 'Tax-exempt status',
      body: [taxStatusDisclaimer],
    },
    {
      id: 'availability',
      heading: 'Service availability & licensing',
      body: [
        availabilityDisclaimer,
        'Entrust United Processing LLC operates the custodial payment processing platform. Availability depends on applicable state licensing requirements and may change over time.',
      ],
    },
    {
      id: 'no-advice',
      heading: 'No legal, tax, or financial advice',
      body: [
        'Nothing on this website constitutes legal, tax, or financial advice. Information is provided for general educational purposes only. You should consult qualified professionals about your specific situation.',
      ],
    },
    {
      id: 'custodial-funds',
      heading: 'Custodial funds',
      body: [
        'Consumer funds processed through the platform are held for-the-benefit-of (FBO) the consumer in segregated custodial accounts and are not the property of Entrust United Corporation or Entrust United Processing LLC. [DRAFT — confirm precise custodial, safeguarding, and insurance representations with counsel.]',
      ],
    },
    {
      id: 'privacy',
      heading: 'Privacy policy',
      body: [
        'This is placeholder privacy policy text. It should describe what information we collect, how it is used, how it is protected, the third parties it may be shared with, your rights, and how to contact us. [DRAFT — attorney review required.]',
        'Until finalized, do not rely on this section as a complete description of our data practices.',
      ],
    },
    {
      id: 'terms',
      heading: 'Terms of use',
      body: [
        'This is placeholder terms-of-use text. It should cover acceptable use, intellectual property, disclaimers of warranties, limitation of liability, governing law (Texas), and how these terms may change. [DRAFT — attorney review required.]',
      ],
    },
  ],

  contactLine:
    'Questions about these disclosures? Contact us — see the Contact page for details.',
};
