

# Add DocuSeal Hybrid eSign Integration to Future Builds

## Overview

This update adds a **second eSign option** to the roadmap - a hybrid approach that integrates with **DocuSeal** (open-source eSign engine) while the CRM handles notifications, short links, and record management. This provides a faster-to-implement alternative to the fully proprietary system.

---

## New Roadmap Entry

Add the following entry to `FUTURE_BUILDS` in the Documents category, positioned after the proprietary eSign system:

```typescript
{
  id: 'esign-docuseal',
  name: 'DocuSeal eSign Integration',
  category: 'Documents',
  priority: 'High',
  description: 'Hybrid eSign system using self-hosted DocuSeal for signing ceremonies with CRM-owned notifications, short links, and artifact storage.',
  status: 'Planned',
  difficulty: 4,
  benefit: 5,
  notes: `CRM + DocuSeal hybrid architecture:
• CRM is system of record; DocuSeal handles signing ceremony + PDF generation
• Signature Requests panel on Lead/Client records with multi-signer support (Client + Co-Client)
• Send for Signature wizard with template selection and signer configuration
• Signing modes: Parallel (default) or Sequential
• Delivery: Email + SMS (Twilio), Email only, or SMS only
• CRM-owned short links (/s/{token}) that redirect to DocuSeal signing URLs
• Inline DocuSeal field tags in DOCX/HTML templates for proper text reflow
• Webhook receiver for DocuSeal events (viewed, signed, completed, declined)
• Automatic artifact retrieval: Executed PDF, Completion Certificate, Evidence JSON
• Workflow action node: "Send Template for Signature (DocuSeal)"
• Language support: English/Spanish
• Expiration dates and reminder scheduling
• Status tracking: Draft, Queued, Sent, Viewed, Partially Signed, Completed, Declined, Expired, Canceled, Error
• Timeline entries for all signature events
• Idempotent job processing: create-send, reminders, expiration, completion`,
},
```

---

## Rating Justification

| Rating | Value | Reasoning |
|--------|-------|-----------|
| **Difficulty** | 4 (Hard) | Less complex than proprietary (no signing ceremony UI to build), but requires: DocuSeal API integration, webhook processing, short link system, Twilio SMS, artifact retrieval, job queues |
| **Benefit** | 5 (High) | Same business value as proprietary system - keeps data in CRM, enables automation, supports multi-signer flows |

---

## Comparison: Proprietary vs DocuSeal Hybrid

| Aspect | Proprietary (`esign-system`) | DocuSeal Hybrid (`esign-docuseal`) |
|--------|------------------------------|-------------------------------------|
| **Difficulty** | 5 (Very Hard) | 4 (Hard) |
| **Signing Ceremony** | Build from scratch | DocuSeal provides |
| **PDF Rendering** | Build from scratch | DocuSeal provides |
| **Audit Trail** | Build hash chain | DocuSeal provides |
| **Hosting** | Fully internal | Self-hosted DocuSeal instance |
| **Cost** | Zero external | DocuSeal hosting costs |
| **Time to Implement** | Longer | Shorter |
| **Customization** | Full control | Limited to DocuSeal capabilities |

---

## Data Model Summary

New tables (same structure for both approaches):

| Table | Purpose |
|-------|---------|
| `signature_packages` | Container with CRM record link, template, status, DocuSeal submission ID, artifact URLs |
| `signature_signers` | Per-signer details: role (Client/CoClient), contact info, CRM short token, DocuSeal recipient ID |
| `signature_events` | Append-only audit log from CRM and DocuSeal webhook events |

---

## Integration Points

### DocuSeal Configuration (Secrets)
- `DOCUSEAL_BASE_URL` - Self-hosted instance URL
- `DOCUSEAL_API_KEY` - API authentication
- `DOCUSEAL_WEBHOOK_SECRET` - Webhook signature verification

### Twilio Configuration (Existing)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

---

## Components to Build

### CRM UI
- `SignatureRequestsPanel` - Lead/Client record sidebar
- `SendForSignatureWizard` - Template + signer configuration modal
- `SignaturePackageDetail` - Timeline, status, artifact downloads
- `DocuSealSettingsTab` - Connection test and configuration

### Backend (Edge Functions)
- `create-signature-package` - Create DocuSeal submission, generate short links
- `docuseal-webhook` - Receive and process DocuSeal events
- `send-signature-notifications` - Email/SMS via CRM providers
- `process-signature-reminders` - Scheduled reminder dispatch
- `process-signature-completion` - Fetch and store artifacts

### Short Link System
- Public route `/s/{token}` that validates token and redirects to DocuSeal signing URL
- Logs "link opened" event before redirect

---

## Workflow Integration

New action type for workflow engine:

```typescript
{
  type: 'send_for_signature_docuseal',
  config: {
    template_id: 'uuid',
    signer_mapping: {
      client: { name_field: 'first_name + last_name', email_field: 'email', phone_field: 'phone' },
      co_client: { name_field: 'co_client_name', email_field: 'co_client_email', phone_field: 'co_client_phone' }
    },
    signing_mode: 'parallel' | 'sequential',
    delivery_policy: 'email_sms' | 'email_only' | 'sms_only',
    expiration_days: 30,
    reminder_schedule: [7, 3, 1]
  }
}
```

Execution must be idempotent - same record + template + workflow stage should not create duplicates.

---

## Also Add: DocuSeal Integration Entry

Add to `INTEGRATIONS` array:

```typescript
{
  id: 'docuseal',
  name: 'DocuSeal',
  purpose: 'Electronic signature ceremonies and PDF execution',
  priority: 'High',
  status: 'Research',
  notes: 'Open-source eSign engine. Self-hosted for data control. API for submission creation, webhook for status updates, artifact retrieval.',
  apiDocs: 'https://www.docuseal.co/docs/api',
},
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/docs/roadmapData.ts` | Add `esign-docuseal` to FUTURE_BUILDS, add `docuseal` to INTEGRATIONS |

---

## Implementation Sequence Recommendation

If choosing this hybrid approach:

1. **Phase 1**: Database schema (signature_packages, signature_signers, signature_events)
2. **Phase 2**: DocuSeal API integration (create submission, retrieve artifacts)
3. **Phase 3**: CRM short link system
4. **Phase 4**: Notification dispatch (Email + Twilio SMS)
5. **Phase 5**: Webhook receiver and status updates
6. **Phase 6**: UI components (panel, wizard, detail page)
7. **Phase 7**: Workflow action node
8. **Phase 8**: Admin settings and connection testing

