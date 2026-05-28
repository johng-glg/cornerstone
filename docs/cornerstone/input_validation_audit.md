# Input Validation Audit — Operation Cornerstone Phase 1A

**Generated:** 2026-05-28

## Scope

Spot-check of write paths that accept user input (forms + edge functions) for:
- Server-side validation (zod or equivalent on the server / RLS predicates)
- Client-side validation (react-hook-form + zod)
- SQL-injection surface (parameterized vs string-interpolated)
- File upload validation (mime, size, bucket scoping)
- XSS surface (untrusted HTML rendering)

## Findings

| Surface | Validation | Risk | Disposition |
|---|---|---|---|
| All `react-hook-form` forms (Leads, Clients, Services, Litigation, Settings) | zod schemas via `zodResolver` | Low | OK |
| Supabase JS client writes | Parameterized by PostgREST; no string-interpolated SQL | None | OK |
| Edge functions (`reset-staff-password`, `provision-staff`, etc.) | Inputs validated against typed shapes before DB calls; `service_role` only invoked after RBAC check via `has_role` | Low | OK |
| Storage uploads (`litigation-documents`, `client-documents`, `lead-documents`) | Bucket scoped per RLS memory; client sets content-type. No server-side mime sniffing. | Medium | **Accepted risk** — buckets are not public-write; only authenticated staff can upload. Mime sniffing deferred. |
| Rich-text rendering (notes, templates) | Rendered as text or via controlled template engine (`if/else/each`). No `dangerouslySetInnerHTML` of user input found. | Low | OK |
| Polymorphic `entity_type` / `entity_id` (notes, tasks) | Enum-checked on insert path; RLS validates parent ownership via join. | Low | OK |
| Phone / email / SSN fields | Format-validated client-side; server stores as text without re-validation. | Low | OK — SSN encryption tracked separately in `ssn_encryption_audit.md`. |

## SQL-injection check

No occurrences of:
- `supabase.rpc(name, { … })` with dynamic SQL string params (all use typed JSON).
- Template-literal SQL in edge functions.
- Concatenated identifiers in migrations (all use `format('%I', …)`).

## Recommendations carried into Phase 2+

1. Add server-side mime/size validation to storage uploads when external tenants are onboarded.
2. Add a shared zod schema package consumed by both the React app and edge functions (DRY validation).
3. Add CAPTCHA + rate-limit on the public-facing Lead intake form before commercial launch (rate-limit was deferred per Phase 1A scope decision).

**Status:** Phase 1A input audit complete. No critical findings.
