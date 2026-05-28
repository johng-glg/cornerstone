# Phase 1E Summary — DocuSeal Signed-Doc Auto-Save

**Status:** ✅ Complete (smallest contained slice)

## Shipped

**`supabase/functions/docuseal-webhook/index.ts` → `handleSubmissionCompleted`**

When DocuSeal fires `submission.completed`:

1. Existing behavior (status flip, evidence_json, DocuSeal-hosted URLs) is preserved.
2. **New:** The executed PDF and audit certificate are downloaded server-side and
   uploaded into the private `signed-documents` bucket at
   `{company_id}/{request_id}/{kind}-{ts}-{safe_name}`.
3. Storage paths are appended to `signature_requests.evidence_json.archived_files`
   for replay/debug.
4. When `signature_requests.entity_type = 'client'`, a row per archived file is
   inserted into `client_documents` with:
   - `document_type` = `signed_agreement` or `audit_certificate`
   - `file_url` = storage path inside `signed-documents`
   - `notes` = link back to the originating signature request id.

All failure modes are wrapped in try/catch and logged — the webhook never fails
on archive errors (DocuSeal already has the source of truth).

## Out of scope (intentional)

- Lead-side mirroring (entity_type='lead') — separate follow-up.
- Litigation matter mirroring — separate follow-up.
- Resolving `signed-documents` paths to time-limited signed URLs in the client
  hub UI — current Client Documents tab can be wired in a UI pass.
- Backfill of previously-completed requests — manual replay only.

## Risks / open items

- `client_documents.file_url` historically holds public URLs from
  `client-documents` (public bucket). The new rows store a `signed-documents`
  storage path instead. UI rendering needs to detect "private path vs public
  URL" and call `createSignedUrl` accordingly — flagged for Phase 1F UI pass.
- No download retry / exponential backoff yet; one-shot fetch only.
