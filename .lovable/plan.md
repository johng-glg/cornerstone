

# Template System Implementation Plan

## Overview

Build a comprehensive template system for email, SMS, and document templates with merge fields and conditional clauses. This system will serve as the foundation for the eSign features, workflow automation, and manual communications.

---

## Architecture Summary

```text
+---------------------------+
|     Template Editor       |  (Rich editor with merge field insertion)
+---------------------------+
            |
            v
+---------------------------+
|    Template Storage       |  (templates table with JSONB content)
+---------------------------+
            |
            v
+---------------------------+
|    Merge Engine           |  (Server-side rendering with validation)
+---------------------------+
            |
            v
+---------------------------+
|    Output Channels        |  (Email/SMS/Document generation)
+---------------------------+
```

---

## Database Schema

### New Tables

| Table | Purpose |
|-------|---------|
| `templates` | Master template storage with versioning |
| `template_categories` | Organize templates by use case |
| `template_versions` | Version history for audit compliance |
| `template_usages` | Track where/when templates are used |

### Templates Table Structure

```text
templates
+----------------------+---------------+------------------------------------------+
| Column               | Type          | Description                              |
+----------------------+---------------+------------------------------------------+
| id                   | uuid (PK)     | Primary key                              |
| company_id           | uuid (FK)     | Company ownership                        |
| name                 | text          | Template display name                    |
| description          | text          | Usage description                        |
| category_id          | uuid (FK)     | Category reference                       |
| template_type        | enum          | email, sms, document                     |
| subject              | text          | Email subject (nullable for SMS/doc)     |
| content              | text          | Template body with merge tags            |
| content_html         | text          | Rich HTML content (email/document)       |
| merge_fields         | jsonb         | Available merge field definitions        |
| conditional_clauses  | jsonb         | Conditional logic definitions            |
| is_active            | boolean       | Enable/disable template                  |
| is_system            | boolean       | System template (non-deletable)          |
| language             | enum          | en, es (English, Spanish)                |
| created_by           | uuid (FK)     | Creator staff reference                  |
| created_at           | timestamptz   | Creation timestamp                       |
| updated_at           | timestamptz   | Last modification                        |
| current_version      | integer       | Current version number                   |
+----------------------+---------------+------------------------------------------+
```

### Template Categories Table

```text
template_categories
+----------------------+---------------+------------------------------------------+
| Column               | Type          | Description                              |
+----------------------+---------------+------------------------------------------+
| id                   | uuid (PK)     | Primary key                              |
| company_id           | uuid (FK)     | Company ownership                        |
| name                 | text          | Category name                            |
| description          | text          | Category description                     |
| template_type        | enum          | Filter by type (email, sms, document)    |
| sort_order           | integer       | Display ordering                         |
+----------------------+---------------+------------------------------------------+
```

### Template Versions Table

```text
template_versions
+----------------------+---------------+------------------------------------------+
| Column               | Type          | Description                              |
+----------------------+---------------+------------------------------------------+
| id                   | uuid (PK)     | Primary key                              |
| template_id          | uuid (FK)     | Parent template                          |
| version_number       | integer       | Sequential version                       |
| content              | text          | Snapshot of content                      |
| content_html         | text          | Snapshot of HTML content                 |
| subject              | text          | Snapshot of subject                      |
| created_by           | uuid (FK)     | Who made the change                      |
| created_at           | timestamptz   | Version creation time                    |
| change_notes         | text          | Description of changes                   |
+----------------------+---------------+------------------------------------------+
```

---

## Merge Field System

### Standard Merge Fields by Entity

| Entity | Available Fields |
|--------|-----------------|
| **Lead** | `{lead.first_name}`, `{lead.last_name}`, `{lead.full_name}`, `{lead.email}`, `{lead.phone}`, `{lead.lead_number}`, `{lead.estimated_debt}`, `{lead.status}` |
| **Client** | `{client.first_name}`, `{client.last_name}`, `{client.full_name}`, `{client.email}`, `{client.date_of_birth}`, `{client.primary_phone}`, `{client.primary_address}` |
| **Service** | `{service.service_number}`, `{service.status}`, `{service.plan_type}`, `{service.enrolled_date}`, `{service.monthly_payment}`, `{service.escrow_balance}`, `{service.total_enrolled_debt}` |
| **Liability** | `{liability.creditor_name}`, `{liability.account_number}`, `{liability.current_balance}`, `{liability.enrolled_balance}`, `{liability.status}` |
| **Settlement** | `{settlement.offer_amount}`, `{settlement.savings_amount}`, `{settlement.savings_percentage}`, `{settlement.payment_schedule}` |
| **Company** | `{company.name}`, `{company.phone}`, `{company.email}`, `{company.address}`, `{company.website}` |
| **Staff** | `{staff.first_name}`, `{staff.last_name}`, `{staff.full_name}`, `{staff.email}`, `{staff.title}` |
| **System** | `{today}`, `{current_date}`, `{current_time}`, `{current_year}` |

### Conditional Clause Syntax

Support for conditional content blocks:

```text
{{#if service.status == 'active'}}
Your program is currently active with a monthly payment of {service.monthly_payment}.
{{else}}
Please contact us to discuss your program status.
{{/if}}

{{#if liability.status == 'settled'}}
Congratulations! This account has been settled.
{{/if}}

{{#each liabilities}}
- {creditor_name}: {current_balance}
{{/each}}
```

---

## UI Components

### 1. Template List Page

**Location**: Settings → Templates (new tab)

**Features**:
- Grid/list view of all templates
- Filter by type (Email, SMS, Document)
- Filter by category
- Search by name/content
- Create, Edit, Duplicate, Archive actions
- Preview functionality

### 2. Template Editor Dialog

**Features**:
- Template name and description fields
- Type selector (Email, SMS, Document)
- Category dropdown
- Subject line input (for email)
- Rich text editor (for email/document) OR plain text (for SMS)
- Merge field palette with click-to-insert
- Conditional clause builder
- Preview with sample data
- Version history sidebar
- Save as draft / Publish

### 3. Merge Field Palette

**Features**:
- Collapsible sections by entity
- Search/filter fields
- Click to insert at cursor
- Tooltip showing field description
- Preview of sample value

### 4. Template Selector Component

**Reusable component for other features**:
- Dropdown/modal for selecting templates
- Filter by type/category
- Quick preview
- Recently used section

---

## Workflow Integration

### New Workflow Action Types

Add to existing workflow action types:

```text
send_email_template
+------------------+----------------------------------------------+
| Config Field     | Description                                  |
+------------------+----------------------------------------------+
| template_id      | Selected email template                      |
| to               | Recipient: client_email, staff_email, custom |
| cc               | Optional CC recipients                       |
| bcc              | Optional BCC recipients                      |
+------------------+----------------------------------------------+

send_sms_template
+------------------+----------------------------------------------+
| Config Field     | Description                                  |
+------------------+----------------------------------------------+
| template_id      | Selected SMS template                        |
| to               | Recipient: client_phone, custom              |
+------------------+----------------------------------------------+
```

---

## Edge Functions

### 1. `render-template`

**Purpose**: Server-side template rendering with merge field substitution

**Input**:
- `template_id` or inline template content
- `entity_type` (lead, client, service, etc.)
- `entity_id`
- `additional_data` (optional custom fields)

**Output**:
- Rendered content (text and HTML)
- Rendered subject (for email)
- List of missing/invalid merge fields

### 2. `send-templated-email`

**Purpose**: Render and send email via Resend

**Flow**:
1. Fetch template
2. Fetch entity data
3. Render template
4. Send via Resend API
5. Log to client_communications
6. Track in template_usages

### 3. `send-templated-sms`

**Purpose**: Render and send SMS via Twilio

**Flow**:
1. Fetch template
2. Fetch entity data
3. Render template (plain text, character limit validation)
4. Send via Twilio API
5. Log to client_communications
6. Track in template_usages

---

## Files to Create

### Database Migration
- Creates `templates`, `template_categories`, `template_versions`, `template_usages` tables
- Adds `template_type` enum (email, sms, document)
- Creates RLS policies for company-scoped access
- Seeds default categories

### Types
- `src/types/templates.ts` - TypeScript type definitions

### Hooks
- `src/hooks/useTemplates.ts` - CRUD operations for templates
- `src/hooks/useTemplateCategories.ts` - Category management
- `src/hooks/useTemplateVersions.ts` - Version history queries
- `src/hooks/useRenderTemplate.ts` - Template preview rendering

### Components
- `src/components/templates/TemplateList.tsx` - Main list view
- `src/components/templates/TemplateFormDialog.tsx` - Create/edit dialog
- `src/components/templates/TemplateEditor.tsx` - Rich editor component
- `src/components/templates/MergeFieldPalette.tsx` - Field insertion palette
- `src/components/templates/ConditionalBuilder.tsx` - Conditional clause UI
- `src/components/templates/TemplatePreview.tsx` - Preview with sample data
- `src/components/templates/TemplateSelector.tsx` - Reusable selector
- `src/components/templates/VersionHistoryPanel.tsx` - Version sidebar

### Settings Integration
- `src/components/settings/TemplatesTab.tsx` - Settings page tab

### Edge Functions
- `supabase/functions/render-template/index.ts`
- `supabase/functions/send-templated-email/index.ts`
- `supabase/functions/send-templated-sms/index.ts`

### Documentation
- Update `src/lib/docs/schemaData.ts` with new tables
- Update `src/lib/docs/roadmapData.ts` to mark as In Progress/Completed

---

## Implementation Phases

### Phase 1: Foundation (Database + Types)
1. Create database tables and enums
2. Add RLS policies
3. Create TypeScript types
4. Seed default categories

### Phase 2: Core UI (Template Management)
1. Build TemplateList component
2. Build TemplateFormDialog with basic fields
3. Build TemplateEditor (plain text first)
4. Implement useTemplates hook

### Phase 3: Merge Fields
1. Define merge field registry in code
2. Build MergeFieldPalette component
3. Implement field insertion logic
4. Add render-template edge function

### Phase 4: Rich Editing
1. Add HTML editor for email/document templates
2. Build conditional clause builder
3. Add template preview functionality
4. Implement version history

### Phase 5: Integration
1. Add workflow action types (send_email_template, send_sms_template)
2. Update ActionConfig component
3. Build send-templated-email edge function
4. Build send-templated-sms edge function
5. Add template selector to relevant dialogs

### Phase 6: Polish
1. Add duplicate template functionality
2. Add import/export capability
3. Add template usage analytics
4. Update documentation

---

## Dependencies

**Required Integrations** (from roadmap):
- `resend` - For email delivery (Planned status)
- `twilio` - For SMS delivery (Planned status)

**Note**: Phase 5 email/SMS sending requires these integrations to be implemented first. Template management (Phases 1-4) can proceed independently.

---

## Character Limits and Validation

| Template Type | Limits |
|---------------|--------|
| SMS | 1600 characters max (10 message segments) |
| Email Subject | 150 characters recommended |
| Email Body | No hard limit |
| Document | No hard limit |

---

## Default Template Categories

| Category | Type | Description |
|----------|------|-------------|
| Welcome | Email | New client onboarding |
| Reminders | Email, SMS | Payment and appointment reminders |
| Status Updates | Email, SMS | Service/liability status changes |
| Settlement | Email, Document | Settlement notifications and letters |
| Legal | Document | Legal documents and disclosures |
| Retention | Email, SMS | Client retention outreach |
| Collections | Email, SMS | Payment collection notices |
| General | All | Uncategorized templates |

---

## Success Criteria

1. Staff can create email, SMS, and document templates with merge fields
2. Templates support conditional content based on entity data
3. Templates are versioned with full history
4. Templates can be previewed with sample or real data
5. Workflow automation can trigger templated communications
6. Usage is tracked for analytics and compliance
7. Templates are organized by type and category

