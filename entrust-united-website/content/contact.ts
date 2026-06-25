export const contactContent = {
  meta: {
    title: 'Contact Us | Entrust United',
    description:
      'Get in touch with Entrust United Corporation — for consumers, settlement companies, special-needs families, donors, and partners.',
    path: '/contact',
  },

  hero: {
    eyebrow: 'Contact',
    heading: 'Let’s talk',
    subheading:
      'Whether you’re protecting your money, exploring care for a loved one, or partnering with us, we’d love to hear from you.',
  },

  // The form posts nowhere live; on submit it opens the visitor's mail client
  // via a mailto link (or replace `formAction` with a form-service endpoint).
  form: {
    heading: 'Send us a message',
    // [CONFIRM/REPLACE] Set to a form-service endpoint (e.g. Formspree) to
    // collect submissions, or leave empty to use the mailto fallback.
    formAction: '',
    inquiryTypes: [
      'I’m a consumer / family',
      'I’m a settlement company',
      'Special-needs / lifetime care',
      'Donation / partnership',
      'Press / other',
    ],
    successMessage:
      'Thanks — your message is ready to send. If your email client didn’t open, email us directly at the address below.',
  },

  // Displayed contact details (placeholders — see content/site.ts).
  detailsHeading: 'Other ways to reach us',
};
