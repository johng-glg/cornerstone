# Phase 2E Summary — Storage Hardening (Part 1)

**Status:** Shipped 2026-05-28
**Risk:** Low (config + client validators; no breaking changes to existing files)

## Goal
Tighten what can enter the document buckets before multi-tenant launch. Prevent oversized uploads, block executables/scripts disguised as documents, and unify the rules across every upload site.

## Server-side (bucket config)
Applied to all 4 buckets — `client-documents`, `litigation-documents`, `lead-documents`, `signed-documents`:
- **`file_size_limit`** = 26,214,400 bytes (25 MB) — Storage rejects oversized uploads at the edge.
- **`allowed_mime_types`** — explicit allowlist:
  - `application/pdf`
  - `image/jpeg`, `image/png`, `image/heic`, `image/webp`, `image/tiff`, `image/gif`
  - `application/msword`, `…wordprocessingml.document` (.doc/.docx)
  - `application/vnd.ms-excel`, `…spreadsheetml.sheet` (.xls/.xlsx)
  - `application/vnd.ms-powerpoint`, `…presentationml.presentation` (.ppt/.pptx)
  - `text/plain`, `text/csv`
  - `message/rfc822` (.eml), `application/vnd.ms-outlook` (.msg)

Anything else (executables, scripts, archives, video, audio, HTML) is rejected by Supabase Storage before bytes hit the bucket.

## Client-side
- **New** `src/lib/storage.ts` — single source of truth:
  - `MAX_DOCUMENT_BYTES` (25 MB), `ALLOWED_DOCUMENT_MIME_TYPES` (Set), `DOCUMENT_ACCEPT_ATTR` (file-input `accept` string).
  - `validateDocumentUpload(file)` — returns `{ code, message } | null`. Validates size, MIME, and extension fallback (for files where the browser doesn't supply a MIME type).
- **Wired into 4 upload sites** (replaces ad-hoc 10 MB / PDF/DOC/JPG-only checks):
  - `src/components/leads/LeadDocumentFormDialog.tsx`
  - `src/components/clients/ClientDocumentFormDialog.tsx`
  - `src/components/litigation/DocumentFileUpload.tsx`
  - `src/components/litigation/steps/LitigationDocumentsStep.tsx`
- Friendly destructive toast on rejection; file input is cleared so the user can pick another file.
- Help text and `accept` attributes updated to match the new policy.

## Defense-in-depth
Client validator is a UX shortcut. The bucket config is the real gate — a malicious client that bypasses the JS check still gets rejected by Storage with `Invalid mime type` or `File size limit exceeded`.

## Out of scope (intentional → Phase 2E-2)
- **Bucket privacy flip**: `client-documents`, `litigation-documents`, `lead-documents` are still **public**. Flipping `public=false` requires rewriting every read site (currently store stable `file_url` in DB) to fetch signed URLs on demand. Tracked as 2E-2.
- **Virus scanning**: no ClamAV / VirusTotal hook yet. Would require an edge function triggered by `storage.objects` INSERT and a quarantine bucket. Deferred.
- **Content sniffing** (magic-byte verification beyond MIME): not done. Bucket-level `allowed_mime_types` checks the Content-Type header the client sends, which is trustworthy enough for staff-only uploads today.
- **Audit log of uploads**: Storage operations are not yet wired into `system_audit_log`. Tracked separately.

## Verification
- Bucket configs confirmed via Storage admin (file_size_limit and allowed_mime_types populated on all 4 buckets).
- Manual: dragging a `.exe` or `.zip` into the client docs uploader now shows "File type … is not allowed" without a network round-trip; dragging a 30 MB PDF shows "File is larger than 25 MB".
- Existing uploads/downloads of legitimate PDFs and images unchanged.
