'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { primaryNav, utilityNav } from '@content/site';
import { cn } from '@/lib/cn';
import { Container } from './Container';
import { Logo } from './Logo';
import { ButtonLink } from './Button';

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            aria-label="Entrust United Corporation — home"
          >
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                      isActive(link.href)
                        ? 'text-accent-700'
                        : 'text-brand-700 hover:text-brand-900 hover:bg-brand-50',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/contact"
              className="rounded-md px-3 py-2 text-sm font-medium text-brand-700 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              Contact
            </Link>
            <ButtonLink href="/donate" variant="primary" className="px-4 py-2 text-sm">
              Donate
            </ButtonLink>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-brand-800 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="border-t border-brand-100 bg-white lg:hidden">
          <Container className="py-4">
            <nav aria-label="Mobile">
              <ul className="flex flex-col gap-1">
                {[...primaryNav, ...utilityNav].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'block rounded-md px-3 py-2.5 text-base font-medium',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                        isActive(link.href)
                          ? 'bg-accent-50 text-accent-700'
                          : 'text-brand-800 hover:bg-brand-50',
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
