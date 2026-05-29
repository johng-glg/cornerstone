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
- **A2 — CI pipeline + quality gates.** GitHub Actions `ci.yml` (PR + push to `main`):
  `verify` job runs typecheck, lint, format check, unit tests with coverage, production
  build, and `npm audit` (high/critical block merge); `e2e` job runs the Playwright smoke
  test. Three custom gate scripts enforcing approved divergences (Q-A4) and secret hygiene:
  `check:zod` (every edge function validates input with Zod), `check:cors` (no wildcard
  `Access-Control-Allow-Origin: *`), `check:secrets` (high-signal secret scan over tracked
  files). All gates negative-tested to confirm they fail on violations.
