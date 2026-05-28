# Phase 2D Summary — Inactivity Session Timeout

**Status:** Shipped 2026-05-28
**Risk:** Low (client-only, no schema or backend changes)

## Goal
Automatically sign staff out after a period of inactivity, with a clear warning before logout — required for SOC2-style session hygiene.

## Policy
- **Idle threshold:** 30 minutes of no user activity → forced sign-out.
- **Warning window:** Dialog appears at T-2 minutes with a live countdown and two actions:
  - **Stay signed in** — resets the idle timer.
  - **Sign out now** — immediate sign-out.
- **Activity events tracked:** `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `click`.
- **Cross-tab coordination:** Last-activity timestamp written to `localStorage` (`glg.lastActivityAt`, throttled to 1 write/sec). All tabs share the same idle clock — typing in one tab keeps others alive.
- **Scope:** Only mounts inside `AppLayout` — `/auth`, `/forgot-password`, `/reset-password` are excluded.

## Files
- **New** `src/hooks/useInactivityTimeout.ts` — reusable hook (idleMs, warningMs, enabled, onTimeout) returning `{ warning, remainingMs, reset }`.
- **New** `src/components/auth/InactivityTimeoutDialog.tsx` — shadcn AlertDialog with countdown and Stay/Sign-out actions.
- **Edited** `src/components/layout/AppLayout.tsx` — wired hook + dialog, calls `signOut()` + toast + redirect to `/auth` on timeout.

## On sign-out
- Calls `useAuth().signOut()` (which calls `supabase.auth.signOut()` and clears local state).
- Shows toast: *"Signed out — You were signed out due to inactivity."*
- Redirects to `/auth` with `replace: true`.

## Out of scope (intentional)
- Server-enforced session TTL (Supabase JWTs are still valid for their full lifetime; this is a UX/local-session guard).
- Per-tenant configurable timeout (constant for now; can move to `tenant_feature_flags` later).
- "Lock screen" mode (require password re-entry without full sign-out).
- Activity tracking inside iframes (DocuSeal embeds, etc.) — those won't reset the timer.

## Verification
- Manually: warning dialog renders at T-28min of inactivity; countdown updates each second; "Stay signed in" resets to full 30min; "Sign out now" + auto-timeout both redirect to `/auth` and clear session.
- No DB migration, no new RLS surface, no edge function.
