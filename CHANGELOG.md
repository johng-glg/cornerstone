# Changelog

All notable changes to Cornerstone are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); the project uses conventional commits.

## [Unreleased]

### Added — Phase A

- **A1 — Repository scaffold + tooling.** Vite + React 18 + TypeScript (strict) baseline;
  Tailwind CSS + shadcn/ui configuration; ESLint (flat config, `no-explicit-any` error) +
  Prettier; Husky + lint-staged pre-commit hook; Vitest + Testing Library (with a real unit
  test, replacing Lovable's single placeholder); Playwright E2E scaffold; Zod; `.env.example`
  with no committed secrets. Removed Lovable-Cloud-specific `lovable-tagger`. Pinned
  `@supabase/supabase-js` to an exact version (divergence from Lovable; see
  `docs/lovable_pattern_inventory.md` §9).
