

# Add Proprietary eSign System to Future Builds

## Overview

This update replaces the existing "eSign Integration" research item (which considered DocuSign/HelloSign) with a comprehensive **proprietary eSign system** built directly into the CRM. This is a major feature that will handle document signing ceremonies, notifications, audit trails, and artifact storage.

---

## Changes Required

### 1. Update `src/lib/docs/roadmapData.ts`

**Replace the existing `esign-integration` entry:**

```typescript
// Current entry to replace:
{
  id: 'esign-integration',
  name: 'eSign Integration',
  category: 'Communications',
  priority: 'Medium',
  description: 'Electronic signature capability - evaluate DocuSign, HelloSign, or custom build.',
  status: 'Research',
  difficulty: 4,
  benefit: 4,
}
```

**With the new comprehensive entry:**

```typescript
{
  id: 'esign-system',
  name: 'Proprietary eSign System',
  category: 'Documents',
  priority: 'High',
  description: 'First-class electronic signature system with signing ceremonies, SMS/email notifications, audit trails, and executed PDF storage.',
  status: 'Planned',
  difficulty: 5,
  benefit: 5,
  notes: `Full-featured eSign built into CRM:
• Signature Requests panel on Lead/Client records
• Send for Signature wizard with template selection and merge fields
• Multi-signer support with role assignment (Client, Spouse, Attorney)
• Email + SMS delivery via Twilio/Resend
• Public mobile-first signing ceremony with guided field completion
• Field types: Signature, Initial, Date, Text, Checkbox
• Append-only audit log with IP, user agent, timestamps
• SHA-256 document hashing and evidence bundle
• Executed PDF and Completion Certificate generation
• Workflow action node for automated sending
• Secure tokenized signing links (JWT/OTP)
• Timeline entries for Sent, Viewed, Completed events`,
},
```

---

## Rating Justification

| Rating | Value | Reasoning |
|--------|-------|-----------|
| **Difficulty** | 5 (Very Hard) | Complex system requiring: PDF rendering, public signing web app, notification orchestration, async job processing, cryptographic hashing, artifact generation, Twilio/email integrations |
| **Benefit** | 5 (High) | Core business need - eliminates external eSign costs, keeps data in-house, integrates with existing templates/workflows, enables automation |

---

## Data Model Summary (For Notes)

The following new tables will be created:

| Table | Purpose |
|-------|---------|
| `signature_packages` | Main container linking to Lead/Client, template, status, PDFs |
| `signature_signers` | Signer details per package (name, email, phone, role, status) |
| `signature_fields` | Field definitions (type, page, coordinates, merge_key) |
| `signature_events` | Append-only audit log with hash chain |

---

## Priority Upgrade Reasoning

Upgrading from **Medium** to **High** priority because:

1. **Cost Savings**: Eliminates recurring DocuSign/HelloSign subscription fees
2. **Data Control**: All signature data stays within CRM database
3. **Integration Depth**: Direct integration with CRM templates, workflows, and timeline
4. **Compliance**: Full control over audit trail and evidence preservation
5. **Scale**: Designed for ~3,000 packages/month production volume

---

## Category Change

Moving from **Communications** category to new **Documents** category, as this is primarily a document management feature rather than a communication feature.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/docs/roadmapData.ts` | Replace `esign-integration` with `esign-system` entry |

---

## Implementation Preview

When this feature is eventually built, it will involve:

### Database Schema
- 4 new tables with RLS policies
- Enums for status, field types, delivery methods

### Edge Functions
- `create-signature-package` - Package creation and PDF rendering
- `send-signature-notifications` - Email/SMS dispatch
- `process-signature-submission` - Field validation and completion
- `generate-signature-artifacts` - Executed PDF and certificate generation

### Frontend Components
- `SignatureRequestsPanel` - Lead/Client record sidebar
- `SendForSignatureWizard` - Template selection and signer configuration
- `SigningCeremony` - Public signing web app (separate route)
- `SignatureTimeline` - Activity entries

### Workflow Integration
- New action type: `send_for_signature`
- Idempotent execution to prevent duplicates

