import Link from 'next/link';
import { footerNav, footerDisclaimer, site } from '@content/site';
import { Container } from './Container';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="bg-brand-900 text-brand-100">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-6">
            <Logo invert />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-200">
              {site.tagline}
            </p>
          </div>

          {footerNav.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-brand-700/60 pt-8">
          {/* Site-wide compliance disclaimer */}
          <p className="text-xs leading-relaxed text-brand-300">{footerDisclaimer}</p>
          <div className="mt-4 flex flex-col gap-2 text-xs text-brand-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {site.name}. {site.subsidiary} operates the custodial processing platform.
            </p>
            <p>
              <Link href="/disclosures" className="hover:text-white underline-offset-2 hover:underline">
                Disclosures, privacy &amp; terms
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
