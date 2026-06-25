import type { MetadataRoute } from 'next';
import { site, primaryNav, utilityNav } from '@content/site';

// Generated at build time into out/sitemap.xml (compatible with output: 'export').
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', ...primaryNav.map((l) => l.href), ...utilityNav.map((l) => l.href)];
  return paths.map((path) => ({
    url: new URL(path, site.url).toString(),
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
