
# Enable DocuSeal Native Email Delivery

## Overview
Enable DocuSeal's built-in email notifications so signers receive signing request emails directly from DocuSeal. This is a simple change to the `docuseal-send` edge function that switches the `send_email` flags from `false` to `true`.

## Current State
The edge function currently sets `send_email: false` in two places:
- **Line 107**: Per-submitter level
- **Line 113**: Submission level

This was intentional because the architecture planned for the CRM to handle notifications via Resend/Twilio, but that layer isn't implemented yet.

## Changes Required

### File: `supabase/functions/docuseal-send/index.ts`

**Change 1 - Submitter level (line 107)**
```typescript
// Before
send_email: false, // CRM handles notifications

// After
send_email: true, // DocuSeal sends signing emails
```

**Change 2 - Payload level (line 113)**
```typescript
// Before
send_email: false,

// After
send_email: true,
```

**Change 3 - Update TODO comment (lines 209-210)**
```typescript
// Before
// TODO: Send email/SMS notifications via Resend/Twilio
// This will be implemented in Phase 4 when notification providers are configured

// After
// NOTE: Currently using DocuSeal's native email delivery
// Future: Implement custom notifications via Resend/Twilio for branded emails
```

## What This Enables
- Signers will receive DocuSeal's standard signing invitation emails
- Emails will come from DocuSeal's domain (not your custom domain)
- All signing lifecycle emails handled by DocuSeal (reminders, completion, etc.)

## Future Enhancement (Not in Scope)
When Resend/Twilio integration is implemented, you can:
- Switch back to `send_email: false`
- Send branded emails from your domain
- Have full control over email templates and delivery timing

## Testing
After the change is deployed, create a new signature request and verify:
1. The signer receives an email from DocuSeal
2. The email contains a link to sign the document
3. Clicking the link opens the DocuSeal signing experience
