import type { Metadata, Viewport } from 'next';
import './globals.css';
import { site } from '@content/site';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Custodial Protection & Lifetime Care`,
    template: `%s · ${site.shortName}`,
  },
  description:
    'A Texas nonprofit with a dual mission: neutral custodial protection of consumer funds in debt settlement, and lifetime care for special-needs individuals.',
  applicationName: site.name,
  keywords: [
    'nonprofit',
    'custodial payment processing',
    'debt settlement',
    'special needs trust',
    'consumer protection',
    'FBO segregated funds',
  ],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.svg' }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#163840',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {/* Skip-to-content link for keyboard users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
