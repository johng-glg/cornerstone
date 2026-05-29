// Pure DocuSeal helpers (no I/O) — webhook event classification, status mapping, and the
// submission-create payload. Unit-tested under `deno test`.

export type SignerStatus = "pending" | "sent" | "viewed" | "signed" | "declined";
export type RequestStatus =
  | "draft"
  | "queued"
  | "sent"
  | "viewed"
  | "partially_signed"
  | "completed"
  | "declined"
  | "expired"
  | "canceled"
  | "error";

export interface DocusealEventClass {
  /** Which record the event primarily updates. */
  scope: "signer" | "submission" | "other";
  /** New signer status (when scope === "signer"). */
  signerStatus?: SignerStatus;
  /** New request status to apply (best-effort; "completed" only on submission.completed). */
  requestStatus?: RequestStatus;
}

/**
 * Classify a DocuSeal webhook `event_type`.
 *   form.viewed/started → signer viewed; form.completed → signer signed (request partially_signed
 *   pending reconciliation); form.declined → declined; submission.completed → request completed;
 *   submission.expired → expired.
 */
export function classifyDocusealEvent(eventType: string | null | undefined): DocusealEventClass {
  switch (String(eventType ?? "").toLowerCase()) {
    case "form.viewed":
    case "form.started":
      return { scope: "signer", signerStatus: "viewed", requestStatus: "viewed" };
    case "form.completed":
      return { scope: "signer", signerStatus: "signed", requestStatus: "partially_signed" };
    case "form.declined":
      return { scope: "signer", signerStatus: "declined", requestStatus: "declined" };
    case "submission.created":
      return { scope: "submission", requestStatus: "sent" };
    case "submission.completed":
      return { scope: "submission", requestStatus: "completed" };
    case "submission.expired":
      return { scope: "submission", requestStatus: "expired" };
    case "submission.archived":
      return { scope: "submission", requestStatus: "canceled" };
    default:
      return { scope: "other" };
  }
}

export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

// deno-lint-ignore no-explicit-any
type Data = Record<string, any>;

/** The DocuSeal submission id an event refers to (form events nest it under submission_id). */
export function submissionIdOf(data: Data | null | undefined): number | null {
  if (!data) return null;
  const raw = data.submission_id ?? data.submission?.id ?? (data.documents ? data.id : undefined);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The executed (combined) PDF URL from a completed-submission payload, if present. */
export function pickExecutedPdfUrl(data: Data | null | undefined): string | null {
  if (!data) return null;
  return (
    data.combined_document_url ??
    data.documents?.find?.((d: Data) => d?.url)?.url ??
    data.documents?.[0]?.url ??
    null
  );
}

export function pickCertificateUrl(data: Data | null | undefined): string | null {
  return data?.audit_log_url ?? data?.certificate_url ?? null;
}

export interface SignerInput {
  signer_role: string;
  name: string;
  email: string;
  phone?: string | null;
  order_index?: number;
  id?: string; // local signer id, passed as external_id for round-trip matching
}

export interface SubmissionPayload {
  template_id: number;
  send_email: boolean;
  send_sms: boolean;
  order: "preserved" | "random";
  submitters: Array<{
    role: string;
    name: string;
    email: string;
    phone?: string;
    external_id?: string;
  }>;
}

/** Build the POST /submissions body from a request's signers + signing/delivery options. */
export function buildSubmissionPayload(
  templateId: number,
  signers: SignerInput[],
  opts: { signingMode?: string; deliveryMethod?: string } = {},
): SubmissionPayload {
  const delivery = opts.deliveryMethod ?? "email_only";
  const ordered = [...signers].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return {
    template_id: templateId,
    send_email: delivery === "email_only" || delivery === "email_sms",
    send_sms: delivery === "sms_only" || delivery === "email_sms",
    order: opts.signingMode === "sequential" ? "preserved" : "random",
    submitters: ordered.map((s) => ({
      role: s.signer_role,
      name: s.name,
      email: s.email,
      ...(s.phone ? { phone: s.phone } : {}),
      ...(s.id ? { external_id: s.id } : {}),
    })),
  };
}
