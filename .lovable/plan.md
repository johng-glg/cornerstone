
# DocuSeal eSign Integration Plan

## Overview
Implement a hybrid eSign system where the CRM is the system of record, and DocuSeal handles signing ceremonies and PDF generation. The CRM will manage signature requests, deliver notifications via its own channels (Email/SMS), generate short links, and store all signed artifacts.

---

## Architecture Diagram

```text
+------------------+        +-------------------+        +------------------+
|    CRM (React)   |        |   Edge Functions  |        |    DocuSeal      |
|------------------|        |-------------------|        |------------------|
| Signature Panel  |------->| docuseal-send     |------->| Create Submission|
| Send Wizard      |        | docuseal-webhook  |<-------| Webhook Events   |
| Timeline Events  |<-------|                   |        | PDF Generation   |
+------------------+        +-------------------+        +------------------+
                                    |
                                    v
                            +---------------+
                            |   Supabase    |
                            |---------------|
                            | signature_    |
                            |   requests    |
                            | signature_    |
                            |   signers     |
                            | signature_    |
                            |   events      |
                            +---------------+
```

---

## Database Schema

### 1. `signature_requests` table
Main table tracking each signature request sent from the CRM.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK to companies |
| entity_type | text | 'lead' or 'client' |
| entity_id | uuid | Lead or Client ID |
| template_id | uuid | FK to templates (CRM template) |
| docuseal_template_id | integer | DocuSeal template ID |
| docuseal_submission_id | integer | DocuSeal submission ID (after send) |
| title | text | Document title |
| status | signature_request_status enum | Draft, Queued, Sent, Viewed, Partially Signed, Completed, Declined, Expired, Canceled, Error |
| signing_mode | text | 'parallel' or 'sequential' |
| delivery_method | text | 'email_sms', 'email_only', 'sms_only' |
| language | text | 'en' or 'es' |
| expires_at | timestamptz | Expiration date |
| completed_at | timestamptz | When all signers completed |
| executed_pdf_url | text | URL to final signed PDF |
| certificate_url | text | URL to completion certificate |
| evidence_json | jsonb | DocuSeal audit/evidence data |
| short_token | text | Unique token for /s/{token} redirect |
| created_by | uuid | FK to staff |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 2. `signature_signers` table
Individual signers within a signature request.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| request_id | uuid | FK to signature_requests |
| signer_role | text | 'client', 'co_client', 'attorney', etc. |
| name | text | Full name |
| email | text | Email address |
| phone | text | Phone for SMS delivery |
| docuseal_submitter_id | integer | DocuSeal submitter ID |
| signing_url | text | DocuSeal signing URL |
| status | signer_status enum | Pending, Sent, Viewed, Signed, Declined |
| signed_at | timestamptz | When this signer completed |
| ip_address | text | Signer's IP |
| user_agent | text | Signer's browser |
| order_index | integer | For sequential signing order |
| created_at | timestamptz | |

### 3. `signature_events` table
Append-only audit log of all signature events.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| request_id | uuid | FK to signature_requests |
| signer_id | uuid | FK to signature_signers (nullable) |
| event_type | text | 'sent', 'viewed', 'signed', 'declined', 'expired', 'completed', 'reminder_sent' |
| event_data | jsonb | Additional event metadata |
| occurred_at | timestamptz | When event happened |
| created_at | timestamptz | |

### 4. `docuseal_templates` table
Maps CRM templates to DocuSeal template IDs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK to companies |
| name | text | Template name |
| docuseal_template_id | integer | DocuSeal template ID |
| description | text | Template description |
| signer_roles | jsonb | Array of role definitions |
| is_active | boolean | Whether template is available |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Enums to Add
```sql
CREATE TYPE signature_request_status AS ENUM (
  'draft', 'queued', 'sent', 'viewed', 'partially_signed', 
  'completed', 'declined', 'expired', 'canceled', 'error'
);

CREATE TYPE signer_status AS ENUM (
  'pending', 'sent', 'viewed', 'signed', 'declined'
);
```

---

## Edge Functions

### 1. `docuseal-send` - Create and send signature requests

Responsibilities:
- Fetch signature request and signers from database
- Call DocuSeal API to create submission
- Update database with DocuSeal IDs and signing URLs
- Send notifications via Resend (email) and/or Twilio (SMS)
- Generate CRM short link token

```typescript
// POST /functions/v1/docuseal-send
interface SendRequest {
  signature_request_id: string;
}

// Flow:
// 1. Fetch request + signers from DB
// 2. Create DocuSeal submission (send_email: false, send_sms: false)
// 3. Store docuseal_submission_id and signing URLs
// 4. Send CRM-owned notifications with short links
// 5. Log signature_events
```

### 2. `docuseal-webhook` - Handle DocuSeal events

Responsibilities:
- Receive webhook events from DocuSeal
- Validate webhook signature
- Update signer and request status
- Download and store artifacts on completion
- Log events to signature_events table

```typescript
// POST /functions/v1/docuseal-webhook
// Webhook events: form.viewed, form.started, form.completed, form.declined

// On form.completed (all signers done):
// 1. Download executed PDF from DocuSeal
// 2. Download completion certificate
// 3. Store in Supabase Storage
// 4. Update signature_request with URLs
// 5. Create timeline entry on Lead/Client
```

### 3. `docuseal-reminder` - Send signature reminders

Responsibilities:
- Query pending signatures past reminder threshold
- Send reminder notifications
- Log reminder events

### 4. `signature-short-link` - Redirect handler (optional)
Could also be handled client-side via React Router.

---

## TypeScript Types

### New file: `src/types/esign.ts`

```typescript
export type SignatureRequestStatus = 
  | 'draft' | 'queued' | 'sent' | 'viewed' 
  | 'partially_signed' | 'completed' | 'declined' 
  | 'expired' | 'canceled' | 'error';

export type SignerStatus = 
  | 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';

export type SignerRole = 'client' | 'co_client' | 'attorney';
export type DeliveryMethod = 'email_sms' | 'email_only' | 'sms_only';
export type SigningMode = 'parallel' | 'sequential';

export interface SignatureRequest {
  id: string;
  company_id: string;
  entity_type: 'lead' | 'client';
  entity_id: string;
  title: string;
  status: SignatureRequestStatus;
  signing_mode: SigningMode;
  delivery_method: DeliveryMethod;
  language: 'en' | 'es';
  expires_at: string | null;
  completed_at: string | null;
  executed_pdf_url: string | null;
  certificate_url: string | null;
  short_token: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  signers?: SignatureSigner[];
  events?: SignatureEvent[];
  creator?: { first_name: string; last_name: string };
}

export interface SignatureSigner {
  id: string;
  request_id: string;
  signer_role: SignerRole;
  name: string;
  email: string;
  phone: string | null;
  status: SignerStatus;
  signed_at: string | null;
  order_index: number;
}

export interface SignatureEvent {
  id: string;
  request_id: string;
  signer_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  occurred_at: string;
}

export interface DocuSealTemplate {
  id: string;
  company_id: string;
  name: string;
  docuseal_template_id: number;
  description: string | null;
  signer_roles: { role: string; name: string }[];
  is_active: boolean;
}
```

---

## React Components

### 1. Signature Requests Panel
Display on Lead and Client detail pages.

**File:** `src/components/esign/SignatureRequestsPanel.tsx`

```text
+------------------------------------------------------------------+
| Signature Requests                          [+ Send for Signature]|
+------------------------------------------------------------------+
| Contract Agreement          | Completed ✓   | Jan 15, 2026       |
| John Doe (Client)           | Signed ✓      |                    |
| Jane Doe (Co-Client)        | Signed ✓      |                    |
|                             |               | [View PDF] [Details]|
+------------------------------------------------------------------+
| Disclosure Form             | Awaiting      | Jan 16, 2026       |
| John Doe (Client)           | Pending ⏳    |                    |
|                             |               | [Resend] [Details]  |
+------------------------------------------------------------------+
```

### 2. Send for Signature Wizard
Multi-step dialog for creating signature requests.

**File:** `src/components/esign/SendSignatureWizard.tsx`

Steps:
1. **Template Selection** - Choose DocuSeal template
2. **Signer Configuration** - Add signers with roles, pre-fill from Lead/Client data
3. **Delivery Options** - Email/SMS, language, expiration, signing mode
4. **Review & Send** - Preview and confirm

### 3. Signature Request Detail Sheet
Slide-out panel showing full request details.

**File:** `src/components/esign/SignatureRequestSheet.tsx`

- Header with status badge and title
- Signers list with individual statuses
- Timeline of events (sent, viewed, signed)
- Actions: Resend, Cancel, Download PDF

### 4. DocuSeal Template Manager (Settings)
Manage linked DocuSeal templates.

**File:** `src/components/settings/DocuSealTemplatesTab.tsx`

- List of synced templates
- Sync button to fetch from DocuSeal
- Edit signer role mappings

---

## React Query Hooks

### New file: `src/hooks/useSignatureRequests.ts`

```typescript
// Core hooks
useSignatureRequests(entityType, entityId)
useSignatureRequest(id)
useCreateSignatureRequest()
useSendSignatureRequest()  // Triggers docuseal-send
useCancelSignatureRequest()
useResendSignatureReminder()

// DocuSeal templates
useDocuSealTemplates()
useSyncDocuSealTemplates()
```

---

## Workflow Integration

### New Workflow Action: `send_signature`

Add to `src/types/workflow.ts`:

```typescript
export interface SendSignatureActionConfig {
  docuseal_template_id: string;
  signers: {
    role: string;
    source: 'entity_field' | 'specific';
    field?: string;  // e.g., 'client.email' or 'co_client.email'
  }[];
  delivery_method: DeliveryMethod;
  language: 'en' | 'es';
  expires_days?: number;
}
```

Update `WorkflowActionType` enum to include `'send_signature'`.

---

## CRM Short Links

### Route: `/s/:token`

Simple redirect page that:
1. Looks up signature_signer by short_token
2. Logs a 'viewed' event if first visit
3. Redirects to DocuSeal signing URL

**File:** `src/pages/SigningRedirect.tsx`

---

## API Key Configuration

The user will need to provide their DocuSeal API key. This will be stored as a Supabase secret:

- **Secret name:** `DOCUSEAL_API_KEY`
- **Optional:** `DOCUSEAL_API_URL` (for self-hosted instances)

---

## Implementation Phases

### Phase 1: Foundation (Core Tables & Types)
1. Create database migration with all tables and enums
2. Create TypeScript types in `src/types/esign.ts`
3. Add `DOCUSEAL_API_KEY` secret

### Phase 2: DocuSeal API Integration
1. Create `docuseal-send` edge function
2. Create `docuseal-webhook` edge function
3. Test with DocuSeal sandbox

### Phase 3: UI Components
1. Create `useSignatureRequests` hooks
2. Build `SignatureRequestsPanel` component
3. Build `SendSignatureWizard` dialog
4. Build `SignatureRequestSheet` detail view
5. Add "Signatures" section to Lead/Client detail pages

### Phase 4: Notifications & Short Links
1. Integrate with Resend for email delivery (requires API key)
2. Integrate with Twilio for SMS delivery (requires API key)
3. Create `/s/:token` redirect route
4. Implement reminder logic

### Phase 5: Workflow Integration
1. Add `send_signature` action type
2. Update ActionConfig UI
3. Update workflow execution logic

### Phase 6: Settings & Templates
1. Create DocuSeal templates settings tab
2. Implement template sync from DocuSeal
3. Add role mapping configuration

---

## Files to Create

| File | Description |
|------|-------------|
| `src/types/esign.ts` | TypeScript types for eSign |
| `src/hooks/useSignatureRequests.ts` | React Query hooks |
| `src/hooks/useDocuSealTemplates.ts` | Template management hooks |
| `src/components/esign/SignatureRequestsPanel.tsx` | Panel for Lead/Client pages |
| `src/components/esign/SendSignatureWizard.tsx` | Multi-step send wizard |
| `src/components/esign/SignatureRequestSheet.tsx` | Detail slide-out |
| `src/components/esign/SignerCard.tsx` | Signer status card |
| `src/components/esign/SignatureTimeline.tsx` | Event timeline |
| `src/components/settings/DocuSealTemplatesTab.tsx` | Settings template manager |
| `src/pages/SigningRedirect.tsx` | Short link redirect page |
| `supabase/functions/docuseal-send/index.ts` | Send edge function |
| `supabase/functions/docuseal-webhook/index.ts` | Webhook handler |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ClientDetail.tsx` | Add Signatures tab |
| `src/components/leads/LeadDetailSheet.tsx` | Add signature panel |
| `src/pages/Settings.tsx` | Add DocuSeal Templates tab |
| `src/App.tsx` | Add `/s/:token` route |
| `src/types/workflow.ts` | Add send_signature action type |
| `src/components/workflows/ActionConfig.tsx` | Add signature action UI |
| `supabase/config.toml` | Add new edge functions |

---

## Security Considerations

1. **Webhook Validation** - Verify DocuSeal webhook signatures
2. **Short Link Tokens** - Use cryptographically secure random tokens (32+ chars)
3. **RLS Policies** - Company-scoped access to all signature tables
4. **Audit Trail** - Append-only events table for compliance
5. **PDF Storage** - Store in Supabase Storage with proper bucket policies

---

## Next Steps

Before implementation, we need:
1. **DocuSeal API Key** - User to provide via secret configuration
2. **DocuSeal API URL** - If self-hosted, provide the URL; otherwise use `https://api.docuseal.com`
3. **Twilio credentials** (optional for SMS) - For SMS notifications
4. **Resend API key** (optional for email) - For email notifications

Would you like me to proceed with Phase 1 (database schema and types)?
