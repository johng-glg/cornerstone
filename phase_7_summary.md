# Phase 7 — Storage hardening + Realtime channel auth

Closes the four `error`-level findings from the latest security scan:

1. `lead_documents_bucket_public` — public bucket leaking PII to the internet
2. `client_documents_storage_no_company_check` — cross-tenant document read/write
3. `litigation_documents_storage_no_company_check` — same, plus anon access
4. `realtime_messages_no_rls` — anon could subscribe to any broadcast channel

## Database

Migration `20260528_phase7_storage_hardening.sql`:

- `UPDATE storage.buckets SET public = false WHERE id IN ('lead-documents','client-documents','litigation-documents')`.
- New SECDEF helper `public.can_access_storage_object(_bucket, _first_folder)`:
  - Resolves the first path segment as the entity id (lead / client / litigation matter), looks up `company_id`, and calls `can_access_company(auth.uid(), _company_id)`.
  - Fallback: if the segment is a known `companies.id`, allow the company access directly (used by the litigation wizard scratch path `{companyId}/temp/...`).
- Dropped the 12 legacy storage policies for the three buckets. Recreated 12 new ones (one per action per bucket) all gated by `can_access_storage_object` and restricted to the `authenticated` role.
- `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY` + two `authenticated`-only policies for SELECT and INSERT.

`signed-documents` was already private with a stricter policy and is unchanged.

## Frontend

### `src/lib/storage.ts`
- New `PrivateBucket` type.
- `extractStoragePath(bucket, urlOrPath)` — accepts a legacy `.../object/public/<bucket>/<path>` URL or a bare path and returns the bucket-relative path.
- `getSignedDocumentUrl(bucket, urlOrPath, ttl=300)` — returns a short-lived signed URL or `null`.

### `src/components/storage/SignedDocumentLink.tsx`
- New anchor component that resolves the signed URL on click and opens it in a new tab. Friendly toast on access denial.

### Uploaders (now store path, not URL)
- `LeadDocumentFormDialog`
- `ClientDocumentFormDialog`
- `litigation/DocumentFileUpload`
- `litigation/steps/LitigationDocumentsStep` — uploads under `{companyId}/temp/{tempFolderId}/...` so RLS resolves even before a matter exists. Pulls `companyId` from `useCurrentStaff`.

### Viewers (now resolve signed URLs)
- `LeadDocumentsTab`
- `clients/detail/ClientDocumentsTab`
- `litigation/LitigationDocumentList`
- Inline file rows in `ClientDocumentFormDialog`, `litigation/DocumentFileUpload`, and `LitigationDocumentsStep`.

## Backwards compatibility

Existing rows in `lead_documents`, `client_documents`, and `litigation_documents` keep their legacy public URL string in `file_url`. `extractStoragePath` parses the path out of the URL so the same `<SignedDocumentLink>` works for both old and new rows without a data migration. New rows store the bucket-relative path directly.

The only legacy edge case that will not resolve is litigation files uploaded under the old `temp/...` prefix before this phase. Those were transient wizard uploads that should have been replaced when the matter was created; if any orphans exist they can be re-uploaded.

## Realtime impact

`postgres_changes` continues to honor the underlying table RLS, so per-row filtering is unchanged. The new `realtime.messages` policies just block anonymous channel subscription, which is what the scanner flagged.
