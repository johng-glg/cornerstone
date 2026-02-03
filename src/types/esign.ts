// eSign / DocuSeal Integration Types

export type SignatureRequestStatus =
  | 'draft'
  | 'queued'
  | 'sent'
  | 'viewed'
  | 'partially_signed'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'canceled'
  | 'error';

export type SignerStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined';

export type SignerRole = 'client' | 'co_client' | 'attorney' | 'witness' | 'other';
export type DeliveryMethod = 'email_sms' | 'email_only' | 'sms_only';
export type SigningMode = 'parallel' | 'sequential';
export type SignatureEntityType = 'lead' | 'client';

export interface SignatureRequest {
  id: string;
  company_id: string;
  entity_type: SignatureEntityType;
  entity_id: string;
  template_id: string | null;
  docuseal_template_id: number | null;
  docuseal_submission_id: number | null;
  title: string;
  status: SignatureRequestStatus;
  signing_mode: SigningMode;
  delivery_method: DeliveryMethod;
  language: 'en' | 'es';
  expires_at: string | null;
  completed_at: string | null;
  executed_pdf_url: string | null;
  certificate_url: string | null;
  evidence_json: Record<string, unknown> | null;
  short_token: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  signers?: SignatureSigner[];
  events?: SignatureEvent[];
  creator?: { first_name: string; last_name: string };
}

export interface SignatureSigner {
  id: string;
  request_id: string;
  signer_role: string;
  name: string;
  email: string;
  phone: string | null;
  docuseal_submitter_id: number | null;
  signing_url: string | null;
  short_token: string | null;
  status: SignerStatus;
  signed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  order_index: number;
  created_at: string;
}

export interface SignatureEvent {
  id: string;
  request_id: string;
  signer_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface DocuSealTemplate {
  id: string;
  company_id: string;
  name: string;
  docuseal_template_id: number;
  description: string | null;
  signer_roles: SignerRoleDefinition[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignerRoleDefinition {
  role: string;
  name: string;
  required?: boolean;
}

// Form data for creating signature requests
export interface CreateSignatureRequestData {
  entity_type: SignatureEntityType;
  entity_id: string;
  docuseal_template_id: number;
  title: string;
  signing_mode: SigningMode;
  delivery_method: DeliveryMethod;
  language: 'en' | 'es';
  expires_at?: string;
  signers: CreateSignerData[];
}

export interface CreateSignerData {
  signer_role: string;
  name: string;
  email: string;
  phone?: string;
  order_index: number;
}

// Workflow action configuration for send_signature
export interface SendSignatureActionConfig {
  docuseal_template_id: string;
  title: string;
  signers: SignerFieldMapping[];
  delivery_method: DeliveryMethod;
  language: 'en' | 'es';
  expires_days?: number;
}

export interface SignerFieldMapping {
  role: string;
  source: 'entity_field' | 'specific' | 'assigned_role';
  field?: string; // e.g., 'primary_client.email', 'co_client.email'
  specific_email?: string;
  specific_name?: string;
  assigned_role?: string; // e.g., 'attorney', 'case_manager'
}

// DocuSeal API types
export interface DocuSealSubmissionRequest {
  template_id: number;
  send_email: boolean;
  send_sms: boolean;
  submitters: DocuSealSubmitter[];
}

export interface DocuSealSubmitter {
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  fields?: DocuSealField[];
}

export interface DocuSealField {
  name: string;
  value: string | number | boolean;
}

export interface DocuSealSubmissionResponse {
  id: number;
  submitters: DocuSealSubmitterResponse[];
}

export interface DocuSealSubmitterResponse {
  id: number;
  email: string;
  slug: string;
  embed_src: string;
  status: string;
}

// DocuSeal webhook event types
export type DocuSealEventType =
  | 'form.viewed'
  | 'form.started'
  | 'form.completed'
  | 'form.declined'
  | 'submission.completed'
  | 'submission.archived';

export interface DocuSealWebhookPayload {
  event_type: DocuSealEventType;
  timestamp: string;
  data: {
    id: number;
    submission_id: number;
    email: string;
    status: string;
    completed_at?: string;
    declined_at?: string;
    documents?: DocuSealDocument[];
    metadata?: Record<string, unknown>;
    ip?: string;
    ua?: string;
  };
}

export interface DocuSealDocument {
  name: string;
  url: string;
}

// Status display helpers
export const SIGNATURE_REQUEST_STATUS_LABELS: Record<SignatureRequestStatus, string> = {
  draft: 'Draft',
  queued: 'Queued',
  sent: 'Sent',
  viewed: 'Viewed',
  partially_signed: 'Partially Signed',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
  canceled: 'Canceled',
  error: 'Error',
};

export const SIGNER_STATUS_LABELS: Record<SignerStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signed',
  declined: 'Declined',
};

export const SIGNER_ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  co_client: 'Co-Client',
  attorney: 'Attorney',
  witness: 'Witness',
  other: 'Other',
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  email_sms: 'Email & SMS',
  email_only: 'Email Only',
  sms_only: 'SMS Only',
};

export const SIGNING_MODE_LABELS: Record<SigningMode, string> = {
  parallel: 'Parallel (all at once)',
  sequential: 'Sequential (in order)',
};
