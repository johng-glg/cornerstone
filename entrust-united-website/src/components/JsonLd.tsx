import { site } from '@content/site';

/**
 * JSON-LD Organization structured data for the home page. Rendered as a
 * script tag; safe because the content is our own static data.
 */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    description:
      'A Texas nonprofit corporation with a dual mission: neutral custodial protection of consumer funds in debt settlement, and lifetime care for special-needs individuals.',
    email: site.contact.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.contact.address.city,
      addressRegion: site.contact.address.state,
      addressCountry: 'US',
    },
    subOrganization: {
      '@type': 'Organization',
      name: site.subsidiary,
      description: 'Operates the custodial payment processing platform.',
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
