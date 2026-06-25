import type { MetadataRoute } from 'next';
import { site } from '@content/site';

// Generated at build time into out/robots.txt (compatible with output: 'export').
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', site.url).toString(),
  };
}
