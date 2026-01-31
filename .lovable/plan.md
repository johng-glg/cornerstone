

# Guardian Litigation Group CRM - Implementation Plan

## Project Overview
A comprehensive law firm CRM for Guardian Litigation Group, covering Phases 1-3: Foundation, Lead Management, and Liability/Negotiation. This creates a complete debt resolution workflow with role-based access for multiple departments.

---

## 🎨 Branding & Design System

### Color Palette (Guardian Brand)
- **Guardian Gold** (#E0B772) - Primary accent, CTAs, highlights
- **Bold Navy** (#1E2E3E) - Primary dark, navigation, headers
- **Sharp Charcoal** (#343739) - Text, secondary elements
- **Ivory** (#F9F9F9) - Backgrounds, cards
- **Freedom Blue** (#669BBC) - Secondary accent, status indicators

### Typography
- **Headings**: Montserrat Black (all caps for major headings)
- **Body**: Montserrat Medium
- **UI Elements**: Clean, professional, high contrast

### UI Approach
- Professional law firm aesthetic using shadcn/ui components
- Desktop-first with responsive mobile support
- Role-based dashboard customization
- Consistent spacing, clear visual hierarchy

---

## Phase 1: Foundation (Core Infrastructure)

### 1.1 Authentication & User Management
- Supabase Auth with email/password login
- Secure session management
- Password requirements: 12+ chars with complexity rules
- Login/logout pages with Guardian branding

### 1.2 Multi-Company Architecture
- Companies table (law firm, affiliates, financing companies)
- Parent-child company relationships
- Company-level settings and branding options
- Data visibility rules (own_only, parent_and_own, full_hierarchy)

### 1.3 Staff & Roles
- Staff profiles linked to companies
- 8 departments: Admin, Sales/Intake, Client Services, Attorney, Case Manager, Negotiations, Payment Processing, Correspondence
- Role-based permissions (admin, attorney, paralegal, negotiator, etc.)
- Assignment capabilities (engagements, cases, liabilities)

### 1.4 Contact Management
- Full contact profiles (name, DOB, SSN encrypted)
- Multiple phone numbers per contact with type (mobile, home, work)
- Multiple addresses per contact
- TCPA consent tracking with timestamps
- Preferred contact method settings

### 1.5 Engagement (Matter) Management
- Engagement creation with auto-generated numbers (ENG-2026-0001)
- Company tracking (originating vs owning)
- Status management (prospect → active → suspended → closed)
- Primary contact assignment
- Engagement-contact relationships (primary client, co-client, spouse, authorized contact)

### 1.6 Service Assignment
- Services catalog (Debt Resolution, Consumer Defense, Hybrid)
- Engagement-service linking
- Service-specific workflows enabled/disabled

### 1.7 Assignment System
- Flexible entity-based assignments (engagement, case, liability, lead)
- Assignment types: primary attorney, client services rep, litigation attorney, case manager, negotiator
- Assignment history and active status tracking
- One active assignment per type per entity

### 1.8 Task Management
- Task creation with priority levels (low, medium, high, urgent)
- Assignment to staff members
- Due dates and status tracking
- Related entity linking (engagement, liability, case)
- Task types: follow-up, document review, court deadline, settlement negotiation

### 1.9 Basic Dashboard
- Role-aware dashboard showing relevant metrics
- Quick access to assigned work
- Recent activity feed
- Department-specific widgets

---

## Phase 2: Lead Management & Sales

### 2.1 Lead Management
- Lead creation with auto-generated numbers (LEAD-2026-0001)
- Source tracking (web form, referral, phone, advertisement)
- Company attribution (originating → owning)
- Interest type identification (debt resolution, litigation, both)

### 2.2 Lead Pipeline & Kanban
- Visual Kanban board with drag-and-drop
- Pipeline stages: New → Contacted → Qualified → Converted/Lost
- Filterable lead list view
- Lead assignment to sales reps

### 2.3 Lead Activity Logging
- Activity types: calls, emails, SMS, meetings, notes
- Outcome tracking (answered, voicemail, no answer)
- Next action scheduling
- Complete timeline view

### 2.4 Lead Qualification
- Estimated debt amount capture
- Number of debts tracking
- Active lawsuit identification
- Disqualification reasons

### 2.5 Lead → Engagement Conversion Wizard
Multi-step wizard:
1. Confirm/edit contact information
2. Select services (Debt Resolution / Consumer Defense / Both)
3. If Debt Resolution → Add initial liabilities
4. If Consumer Defense → Add case details
5. System auto-assigns Client Services rep and Primary Attorney

Creates engagement + services + assignments + optional liability/case

### 2.6 Sales Dashboard
- Lead pipeline visualization
- Conversion rate metrics
- Performance tracking per rep
- Leads requiring action today
- Source performance analytics

---

## Phase 3: Liability & Negotiation

### 3.1 Creditor Management
- Creditor directory (original creditors, collection agencies, law firms, debt buyers)
- Contact information and address tracking
- Creditor notes and active status
- Quick creditor lookup/autocomplete

### 3.2 Liability (Debt) Tracking
- Liabilities linked to engagements
- Creditor assignment (current + original)
- Balance tracking (original, current, enrolled)
- Liability types: credit card, medical, auto loan, personal loan, student loan
- Status management: enrolled → in_negotiation → settled/in_litigation/dismissed

### 3.3 Liability Assignment
- Assign specific negotiators to specific liabilities
- Workload balancing visibility
- Assignment history tracking
- Priority ordering

### 3.4 Liability Action Logging
- Action types: settlement offers, payments, court filings, balance updates
- Complete timeline per liability
- Staff attribution
- Document attachments

### 3.5 Settlement Management
- Settlement offers with amounts and percentages
- Acceptance/rejection tracking
- Payment schedule options (lump sum vs payment plan)
- Settlement status: offered → accepted → completed/defaulted
- Settlement document linking

### 3.6 Negotiator Dashboard
- My liabilities queue
- Action required indicators
- Performance metrics (settlements, savings percentage)
- Recent creditor contacts
- Settlement tracker view

### 3.7 Attorney Settlement Review
- Pending settlement approvals queue
- Settlement review workflow
- Document review integration
- Approval/rejection with notes

---

## Payment Processing (Mock Data Foundation)

### 3.8 Payment Processor Configuration (UI Ready)
- Processor setup interface (Forth Pay, Global Holdings)
- API credential fields (will be mock data initially)
- Connection test interface
- Default processor per company

### 3.9 Transaction Interface (Mock Data)
- Transaction creation interface
- Transaction status display
- Transaction history table
- Mock transaction lifecycle visualization

---

## Cross-Cutting Features

### Navigation & Layout
- Top navigation: Dashboard | Leads | Engagements | Contacts | Liabilities | Tasks | Reports
- Role-based menu visibility
- Breadcrumb navigation
- Global search (Cmd/Ctrl + K)
- User menu with profile/settings/logout

### Data Tables
- TanStack Table implementation
- Sortable, filterable columns
- Pagination (25, 50, 100 per page)
- Column visibility toggle
- Bulk selection for actions
- Export capabilities (CSV)

### Forms & Validation
- React Hook Form + Zod validation
- Real-time validation with clear errors
- Multi-step wizards for complex flows
- Autocomplete for common fields
- Keyboard shortcuts (Enter to submit)

### Notifications
- Toast notifications (success, error, info, warning)
- Top-right positioning
- Auto-dismiss with pin option

### Row-Level Security
- Company-based data isolation
- Department-based access control
- Assignment-based visibility
- Parent/child company visibility rules

---

## Department Views Summary

| Department | Primary Focus | Key Features |
|------------|--------------|--------------|
| **Sales/Intake** | Leads | Pipeline kanban, conversion wizard, lead activities |
| **Client Services** | Engagements | Client list, communication log, quick actions |
| **Attorney (General)** | Engagements + Settlements | Settlement approvals, document review |
| **Negotiator** | Liabilities | Liability queue, creditor contacts, settlement tracker |
| **Admin** | Everything | Full system access, company/staff management |

---

## Database Structure (Core Tables)

**Multi-Tenancy**: companies, company_permissions, staff, assignments
**Contacts**: contacts, contact_phones, contact_addresses
**Leads**: leads, lead_activities
**Engagements**: engagements, engagement_contacts, services, engagement_services
**Liabilities**: creditors, liabilities, liability_actions, settlements
**Payment (Mock)**: payment_processors, company_processor_configs, transactions
**Supporting**: tasks, documents, communications, activity_log

---

## Technical Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase)
- **State**: React Query (TanStack Query) for server state
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Charts**: Recharts for dashboard visualizations
- **Auth**: Supabase Auth with RLS

---

## Sample Data

Upon completion, the system will include:
- Guardian Litigation Group as parent company
- 5 staff members across departments
- 10 sample creditors
- 10 sample contacts
- 5 sample leads (various statuses)
- 5 sample engagements with services
- 15 sample liabilities across engagements
- Sample tasks and activities

---

## Success Criteria

At the end of Phases 1-3:
- ✅ Sales team can manage leads and convert to engagements
- ✅ Client services can view and manage client engagements
- ✅ Negotiators can manage liabilities and create settlements
- ✅ Attorneys can review and approve settlements
- ✅ All roles have appropriate dashboard views
- ✅ Data properly isolated by company and role
- ✅ Payment UI ready for future API integration

