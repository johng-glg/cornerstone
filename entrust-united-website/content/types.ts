/**
 * Shared content types. All site copy lives in the typed files in this folder
 * so you can edit text without touching component code.
 */

export type IconName =
  | 'shield'
  | 'heart'
  | 'scale'
  | 'lock'
  | 'wallet'
  | 'users'
  | 'building'
  | 'handshake'
  | 'sparkles'
  | 'fileCheck'
  | 'landmark'
  | 'lifeBuoy'
  | 'badgeCheck'
  | 'eye'
  | 'coins'
  | 'phone'
  | 'mail'
  | 'mapPin';

export interface NavLink {
  label: string;
  href: string;
  /** Optional grouping description for accessibility / future mega-nav. */
  description?: string;
}

export interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

export interface Stat {
  value: string;
  label: string;
  /** Marks values that must be verified before launch. */
  confirm?: boolean;
}

export interface AudienceCard {
  icon: IconName;
  audience: string;
  body: string;
  cta: { label: string; href: string };
}

export interface Step {
  title: string;
  body: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface PageMeta {
  title: string;
  description: string;
  /** Path used for canonical + Open Graph URLs. */
  path: string;
}
