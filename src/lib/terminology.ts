/**
 * Centralized user-facing terminology (Cornerstone Phase 1D).
 *
 * Import these constants in UI components instead of hard-coding the words.
 * Code identifiers, table names, route paths, and enum values stay unchanged.
 * See docs/cornerstone/terminology_glossary.md for the full mapping.
 */

export const TERMS = {
  /** Was "Service" / "Services" in UI. */
  engagement: 'Engagement',
  engagements: 'Engagements',
  newEngagement: 'New Engagement',

  /** Was "Debt Settlement". */
  consumerDebtDefense: 'Consumer Debt Defense',

  /** Was "Escrow". */
  plsa: 'PLSA',
  plsaBalance: 'PLSA Balance',
  plsaProjection: 'PLSA Projection',
  /** Long form used on first mention in a screen. */
  plsaLong: 'PLSA (administered by Set Forth)',
} as const;
