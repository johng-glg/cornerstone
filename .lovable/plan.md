
# Comprehensive Enhancement Plan: Phase 10+

This plan addresses all the requirements and decisions from your message, organized into logical implementation phases. Given the scope, I've structured this into immediate changes, near-term features, and documentation for future builds.

---

## Part 1: Immediate Changes (Current Session)

### 1.1 Admin Password Reset Function

Add the ability for admins to reset staff passwords from the Staff Management section.

**Changes Required:**

| File | Change |
|------|--------|
| `supabase/functions/reset-staff-password/index.ts` | New Edge Function using admin API to reset password and send temp password via email |
| `src/components/staff/StaffFormDialog.tsx` | Add "Reset Password" button for existing staff members |
| `src/pages/Staff.tsx` | Add password reset action to the staff table row actions |

**Edge Function Logic:**
- Verify caller has admin role
- Generate secure temporary password
- Use `supabase.auth.admin.updateUserById()` to set new password
- Return temp password to admin (or optionally email it)

---

### 1.2 Remove Self-Registration

Make account creation admin-only by removing the signup tab from the Auth page.

**Changes Required:**

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Remove the entire "signup" TabsContent and TabsTrigger |
| `src/pages/Auth.tsx` | Remove signUpSchema, SignUpFormData, signUpForm, and handleSignUp |
| `src/pages/Auth.tsx` | Change to single Card layout (no Tabs) for login only |
| `src/lib/auth.tsx` | Keep signUp function but remove from public interface (or remove entirely) |

**Result:**
```text
+---------------------------+
|   Guardian Litigation     |
+---------------------------+
|   Welcome Back            |
|   [Email input]           |
|   [Password input]        |
|   [Forgot Password?]      |
|   [Sign In button]        |
+---------------------------+
```

---

### 1.3 Update Documentation Structure

Add comprehensive "Future Build" and "Integration Research" sections to the documentation.

**New Documentation Pages:**

| Page | Content |
|------|---------|
| `src/pages/docs/FutureBuildPage.tsx` | Roadmap of planned features with priority levels |
| `src/pages/docs/IntegrationsPage.tsx` | External integration requirements and research notes |
| `src/pages/docs/SecurityPage.tsx` | Security concerns to address before production |

**Update Files:**

| File | Change |
|------|--------|
| `src/lib/docs/schemaData.ts` | Add FUTURE_BUILDS, INTEGRATIONS_ROADMAP, SECURITY_CONCERNS exports |
| `src/components/docs/DocsSidebar.tsx` | Add new navigation sections: Roadmap, Integrations, Security Concerns |

---

## Part 2: Documentation Content - Future Builds

The following will be documented for future implementation:

### 2.1 Integrations to Research

| Integration | Purpose | Priority | Notes |
|-------------|---------|----------|-------|
| **Google Workspace** | Staff email (individual) | High | OAuth integration for sending emails as user |
| **Resend/SendGrid** | System emails (automated) | High | Transactional emails, notifications, reminders |
| **Twilio** | SMS communications | High | Already have account - need API key integration |
| **Dialpad** | Click-to-call, call pop, queues, dispositioning | High | Research API architecture, webhooks |
| **Amazon S3** | Document storage | Medium | Alternative to Supabase Storage - research SDK |
| **Google Calendar** | Calendar sync | Medium | OAuth for bi-directional sync |
| **Array Credit** | Credit pull integration | Medium | JSON file ingestion for credit reports |
| **Forth Pay** | Payment processor | High | First payment integration |
| **Global Holdings** | Payment processor | Medium | Secondary processor |

### 2.2 Features Roadmap

| Feature | Category | Priority | Description |
|---------|----------|----------|-------------|
| **Global Search** | Core | High | Search across leads, clients, services, liabilities, litigation |
| **Notification Center** | Core | High | Bell icon dropdown with notification list, mark read, preferences |
| **Realtime Updates** | Core | High | Supabase channels for live data updates |
| **Lead Scoring System** | Leads | High | Adjustable criteria with scoring profiles |
| **Lead Assignment Engine** | Leads | High | Round robin, skillset-based, backlog-based |
| **Duplicate Lead Detection** | Leads | High | Match against leads AND clients, email uniqueness |
| **Lead Source Metrics** | Leads | High | Contact ratio, credit pull ratio, conversion, first draft clear rate, retention |
| **Opposing Counsel Directory** | Litigation | High | Two-tier: Firm and Firm Contacts, assignable to matters |
| **Deadline Reminder System** | Litigation | High | Automated reminders for response deadlines, hearings |
| **Payment Processor Integration** | Payments | High | Forth Pay integration with status polling |
| **Recurring Payment Scheduling** | Payments | High | Automated payment scheduling |
| **NSF Retry Logic** | Payments | High | Configurable retry attempts and timing |
| **Escrow Balance Automation** | Payments | Medium | Auto-update from transactions |
| **Creditor Response Tracking** | Settlements | Medium | Track creditor responses, build settlement workflow |
| **Program Success Rate** | Analytics | Medium | Track graduation vs cancellation rates |
| **Scheduled Report Generation** | Reports | Medium | Auto-generate and email reports |
| **Template System** | Communications | Medium | Email, SMS, document templates with merge fields |
| **eSign Integration** | Communications | Medium | Research DocuSign/HelloSign or build custom |
| **Workflow Automation Builder** | Automation | Medium | Visual workflow builder with triggers and conditions |
| **SLA Tracking** | Compliance | Medium | Track response times, processing times |
| **Client Appointment Booking** | Client Portal | Low | Shareable booking links |
| **Client Portal** | Client Portal | Low | Self-service portal for clients |
| **Service Graduation Automation** | Services | Low | Auto-graduate based on criteria |
| **Audit Trail Log** | Admin | Medium | Central log of all system activity |
| **Pagination for List Views** | UI | High | Add to Clients, Leads, Liabilities, Transactions |
| **Bulk Operations** | UI | Medium | Bulk select and actions on list views |

### 2.3 Security Concerns (Address Before Production)

| Issue | Category | Description |
|-------|----------|-------------|
| Session Timeouts | Auth | Implement inactivity timeout (e.g., 30 min) |
| Leaked Password Protection | Auth | Enable Supabase leaked password detection |
| Password Reset Flow | Auth | User-initiated password reset (in addition to admin) |
| SSN Encryption Verification | Data | Verify proper encryption at rest |
| RLS Policy Audit | Database | Full audit of all RLS policies |
| Rate Limiting | API | Implement rate limiting on auth endpoints |
| Input Sanitization | Security | Verify all user inputs are properly sanitized |
| Audit Logging | Compliance | Log all data access and modifications |
| MFA Support | Auth | Add optional multi-factor authentication |
| API Key Rotation | Integrations | Implement key rotation policies |

---

## Part 3: Lead Management Enhancements

### 3.1 Lead Scoring System

**Database Schema:**

```text
lead_scoring_profiles
├── id (uuid, PK)
├── company_id (uuid, FK)
├── name (text) - e.g., "Debt Resolution Standard"
├── description (text)
├── is_default (boolean)
├── criteria (jsonb) - scoring rules
└── created_at, updated_at

leads table additions:
├── lead_score (integer)
├── scoring_profile_id (uuid, FK)
└── scored_at (timestamptz)
```

**Criteria Structure:**
```json
{
  "debt_amount": {
    "weight": 20,
    "ranges": [
      { "min": 0, "max": 10000, "score": 5 },
      { "min": 10000, "max": 25000, "score": 10 },
      { "min": 25000, "max": null, "score": 20 }
    ]
  },
  "has_active_lawsuit": {
    "weight": 15,
    "values": { "true": 15, "false": 0 }
  },
  "source": {
    "weight": 10,
    "values": { "referral": 10, "web_form": 5, "marketing": 3 }
  },
  "contact_completeness": {
    "weight": 10,
    "rules": "has_phone AND has_email = 10, else 5"
  }
}
```

### 3.2 Lead Assignment System

**Database Schema:**

```text
lead_assignment_rules
├── id (uuid, PK)
├── company_id (uuid, FK)
├── name (text)
├── method (enum: round_robin, skill_based, backlog, weighted)
├── config (jsonb) - method-specific configuration
├── is_active (boolean)
├── priority (integer)
└── created_at

lead_assignment_queue
├── id (uuid, PK)
├── staff_id (uuid, FK)
├── current_backlog (integer)
├── skills (text[])
├── is_available (boolean)
├── last_assigned_at (timestamptz)
└── weight (integer)
```

**Assignment Methods:**
1. **Round Robin**: Rotate through available staff
2. **Skill-Based**: Match lead interest_type to staff skills
3. **Backlog-Based**: Assign to staff with lowest current lead count
4. **Weighted**: Combine multiple factors with weights

### 3.3 Duplicate Detection

**Logic:**
- Check email AND phone against existing leads
- Check email AND phone against clients table
- Email must be unique in clients table (add constraint)

**Implementation:**
```typescript
async function checkForDuplicates(lead: LeadInput) {
  // Check leads
  const leadDupes = await supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, status')
    .or(`email.eq.${lead.email},phone.eq.${lead.phone}`)
    .neq('status', 'converted');
  
  // Check clients
  const clientDupes = await supabase
    .from('clients')
    .select('id, first_name, last_name, email')
    .eq('email', lead.email);
  
  return { leadDupes, clientDupes };
}
```

**UI:**
- Warning dialog showing potential duplicates
- Option to proceed, merge, or view existing record
- Block conversion if email already exists in clients

### 3.4 Lead Source Metrics

**New Table:**

```text
lead_source_metrics (materialized view or calculated)
├── source (lead_source enum)
├── total_leads (integer)
├── contacted_count (integer)
├── qualified_count (integer)
├── converted_count (integer)
├── lost_count (integer)
├── contact_ratio (decimal) - contacted / total
├── conversion_ratio (decimal) - converted / total
├── credit_pull_count (integer) - leads with credit auth
├── credit_pull_ratio (decimal)
├── first_draft_clear_count (integer)
├── first_draft_clear_rate (decimal)
├── avg_days_to_convert (decimal)
├── period_start, period_end (date)

lead_rep_metrics
├── staff_id (uuid, FK)
├── period_start, period_end (date)
├── [same metrics as above per rep]
```

---

## Part 4: Litigation Enhancements

### 4.1 Opposing Counsel Directory

**Database Schema:**

```text
law_firms
├── id (uuid, PK)
├── company_id (uuid, FK)
├── name (text)
├── address_line1, address_line2, city, state, zip
├── phone, fax, email
├── website (text)
├── notes (text)
├── is_active (boolean)
└── created_at, updated_at

law_firm_contacts
├── id (uuid, PK)
├── law_firm_id (uuid, FK)
├── first_name, last_name (text)
├── email, phone, extension (text)
├── title (text) - e.g., "Partner", "Associate", "Paralegal"
├── is_primary (boolean)
├── notes (text)
├── is_active (boolean)
└── created_at

litigation_matters additions:
├── opposing_law_firm_id (uuid, FK -> law_firms)
├── opposing_counsel_id (uuid, FK -> law_firm_contacts)
```

### 4.2 Deadline Reminder System

**Database Schema:**

```text
deadline_reminders
├── id (uuid, PK)
├── entity_type (enum: litigation_matter, task, settlement)
├── entity_id (uuid)
├── deadline_field (text) - e.g., "response_deadline"
├── reminder_days_before (integer[]) - e.g., [7, 3, 1]
├── assigned_to (uuid, FK -> staff)
├── is_sent (boolean)
├── sent_at (timestamptz)
├── created_at

notification_queue
├── id (uuid, PK)
├── recipient_id (uuid, FK -> staff)
├── type (enum: deadline, task_due, payment_failed, etc.)
├── title (text)
├── message (text)
├── link (text) - URL to related entity
├── is_read (boolean)
├── created_at
```

**Edge Function: `process-deadline-reminders`**
- Runs on schedule (cron)
- Queries upcoming deadlines
- Creates notifications and optionally sends emails

---

## Part 5: Realtime Architecture

### 5.1 Supabase Realtime Setup

**Enable Realtime on Key Tables:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_communications;
```

### 5.2 React Hook Pattern

```typescript
// src/hooks/useRealtimeNotifications.ts
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // Show toast
          toast({ title: payload.new.title, description: payload.new.message });
          // Invalidate query
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
```

---

## Part 6: Global Search

### 6.1 Implementation Approach

**Search Edge Function: `global-search`**
```typescript
// Searches across multiple tables with relevance scoring
interface SearchResult {
  type: 'lead' | 'client' | 'service' | 'liability' | 'litigation';
  id: string;
  title: string;
  subtitle: string;
  match_field: string;
  relevance: number;
}

async function globalSearch(query: string): Promise<SearchResult[]> {
  // Parallel search across tables
  const [leads, clients, services, liabilities, matters] = await Promise.all([
    searchLeads(query),
    searchClients(query),
    searchServices(query),
    searchLiabilities(query),
    searchLitigationMatters(query),
  ]);
  
  // Combine and sort by relevance
  return [...leads, ...clients, ...services, ...liabilities, ...matters]
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 20);
}
```

### 6.2 UI Component

Replace placeholder in TopNav with Command palette (Ctrl+K):

```typescript
// src/components/GlobalSearch.tsx
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: results } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => supabase.functions.invoke('global-search', { body: { query } }),
    enabled: query.length >= 2,
  });

  // Command palette UI with keyboard shortcut
}
```

---

## Part 7: Notification Center

### 7.1 Database Schema

```text
notifications
├── id (uuid, PK)
├── company_id (uuid, FK)
├── recipient_id (uuid, FK -> staff)
├── type (notification_type enum)
├── title (text)
├── message (text)
├── entity_type (entity_type enum, nullable)
├── entity_id (uuid, nullable)
├── link (text)
├── is_read (boolean, default false)
├── read_at (timestamptz)
├── created_at (timestamptz)

notification_preferences
├── id (uuid, PK)
├── staff_id (uuid, FK)
├── type (notification_type enum)
├── email_enabled (boolean)
├── in_app_enabled (boolean)
├── sms_enabled (boolean)
```

### 7.2 UI Component

Replace hardcoded "3" badge in TopNav with real notification dropdown:

```typescript
// src/components/NotificationCenter.tsx
export function NotificationCenter() {
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        {/* Notification list with mark all read, settings link */}
      </PopoverContent>
    </Popover>
  );
}
```

---

## Part 8: Email Integration Decision

### Recommendation: Hybrid Approach

| Type | Provider | Use Case |
|------|----------|----------|
| **System Emails** | Resend/SendGrid | Automated notifications, reminders, password resets |
| **Individual Emails** | Google Workspace | Staff sending emails to clients (tracked in CRM) |

**Rationale:**
- System emails need high deliverability and don't need individual signatures
- Staff emails should come from their @company.com address with signature
- Google Workspace OAuth allows "send as" functionality

**Implementation Notes (for docs):**
- Resend Edge Function for transactional emails (already supported)
- Google OAuth integration for compose/send from staff accounts
- Store sent emails in client_communications table

---

## Part 9: Files to Create/Modify

### New Files

| File Path | Purpose |
|-----------|---------|
| `supabase/functions/reset-staff-password/index.ts` | Admin password reset Edge Function |
| `src/pages/docs/FutureBuildPage.tsx` | Roadmap documentation page |
| `src/pages/docs/IntegrationsPage.tsx` | Integrations research page |
| `src/pages/docs/SecurityPage.tsx` | Security concerns page |
| `src/lib/docs/roadmapData.ts` | Data exports for future builds, integrations, security |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `src/pages/Auth.tsx` | Remove signup functionality, login-only |
| `src/pages/Staff.tsx` | Add password reset action |
| `src/components/staff/StaffFormDialog.tsx` | Add Reset Password button |
| `src/components/docs/DocsSidebar.tsx` | Add new navigation sections |
| `src/App.tsx` | Add new doc routes |
| `supabase/config.toml` | Add reset-staff-password function config |

---

## Implementation Summary

### This Session (Part 1)
1. Create `reset-staff-password` Edge Function
2. Update Staff page with password reset action
3. Remove signup from Auth page (login-only)
4. Create documentation pages for Future Builds, Integrations, Security
5. Update DocsSidebar with new sections
6. Populate comprehensive roadmap data

### Next Sessions (Parts 2-9)
All features documented for iterative implementation based on priority.

---

## Technical Notes

### Email Integration
- **Recommendation**: Use Resend for system emails (already supported), Google Workspace for individual staff emails via OAuth
- Document in Integrations page for future build

### Document Storage  
- **Current**: Two Supabase Storage buckets exist (`litigation-documents`, `client-documents`)
- **S3 Option**: Document in Integrations page for research - may be beneficial for large volume

### Dialpad Integration
- Requires API research before implementation
- Key features: Click-to-call buttons, call pop (incoming caller ID lookup), disposition codes, queue management
- Document in Integrations page

### eSign
- Options: DocuSign, HelloSign, or custom implementation
- Document in Integrations page for research
