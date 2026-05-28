/**
 * Shared storage upload guardrails — Phase 2E.
 *
 * Server-side limits are also enforced on the bucket config
 * (file_size_limit + allowed_mime_types). These client-side checks
 * exist to give the user a friendly error before the upload round-trip
 * and to catch obviously-wrong files (e.g. .exe renamed to .pdf by
 * extension only) earlier.
 */

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'image/tiff',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'message/rfc822',
  'application/vnd.ms-outlook',
]);

/** File-input `accept` string mirroring the allowlist above. */
export const DOCUMENT_ACCEPT_ATTR =
  '.pdf,.jpg,.jpeg,.png,.heic,.webp,.tif,.tiff,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.eml,.msg';

/** Extension-based fallback when the browser doesn't supply a MIME type. */
const ALLOWED_EXTENSIONS = new Set([
  'pdf','jpg','jpeg','png','heic','webp','tif','tiff','gif',
  'doc','docx','xls','xlsx','ppt','pptx',
  'txt','csv','eml','msg',
]);

export interface UploadValidationError {
  code: 'too_large' | 'bad_type' | 'empty';
  message: string;
}

/**
 * Validate a file before uploading to a document bucket.
 * Returns `null` if the file is acceptable.
 */
export function validateDocumentUpload(file: File): UploadValidationError | null {
  if (!file || file.size === 0) {
    return { code: 'empty', message: 'File is empty.' };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      code: 'too_large',
      message: `File is larger than 25 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    };
  }
  const mimeOk = file.type && ALLOWED_DOCUMENT_MIME_TYPES.has(file.type);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return {
      code: 'bad_type',
      message: `File type "${file.type || ext || 'unknown'}" is not allowed.`,
    };
  }
  return null;
}
