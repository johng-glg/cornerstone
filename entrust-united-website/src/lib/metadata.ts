import type { Metadata } from 'next';
import { site } from '@content/site';
import type { PageMeta } from '@content/types';

/** Build per-page Metadata (title, description, canonical, Open Graph). */
export function pageMetadata(meta: PageMeta): Metadata {
  const url = new URL(meta.path, site.url).toString();
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: site.name,
      title: meta.title,
      description: meta.description,
      url,
      images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: site.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: ['/og-image.svg'],
    },
  };
}
