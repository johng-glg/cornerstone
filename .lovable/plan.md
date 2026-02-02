

# Phase 7: Role-Based Dashboards - Implementation Plan

## Overview

This plan implements comprehensive role-based dashboards for all staff roles in the system. Currently, only Attorney and Case Manager dashboards exist. We will add dashboards for:
- **Admin/Manager** - Company-wide metrics and oversight
- **Sales/Intake Rep** - Lead pipeline and conversion tracking  
- **Negotiator** - Settlement workflow and liability management
- **Payment Processor** - Transaction processing and payment status
- **Correspondence** - Communication tracking and document status
- **Client Services Rep** - Client engagement and retention

Each dashboard will feature role-specific metrics, quick actions, task lists, and activity feeds using the existing reusable components (`DashboardMetricCard`, `DeadlinesList`, `RecentActivityFeed`).

---

## Roles and Departments

| Role | Department | Primary Focus |
|------|------------|---------------|
| admin | admin | Full system access, company metrics |
| attorney | attorney | Litigation matters, court deadlines |
| case_manager | case_manager | Support for attorneys (paralegal function) |
| negotiator | negotiations | Settlements, liability management |
| sales_rep | sales_intake | Lead pipeline, conversions |
| client_services_rep | client_services | Client engagement, retention |
| payment_processor | payment_processing | Transactions, payments |
| correspondence | correspondence | Communications, documents |
| viewer | - | Read-only access |

---

## Files to Create

### 1. `src/hooks/useDashboardStats.ts`

New hook providing aggregated statistics for dashboards.

**Functions:**
- `useAdminDashboardStats()` - Company-wide metrics
- `useSalesRepStats(staffId)` - Lead pipeline stats
- `useNegotiatorStats(staffId)` - Settlement stats
- `usePaymentProcessorStats()` - Transaction stats
- `useCorrespondenceStats(staffId)` - Communication stats
- `useClientServicesStats(staffId)` - Client engagement stats

---

### 2. `src/components/dashboards/AdminDashboard.tsx`

Company-wide executive dashboard for admins and managers.

**Metrics:**
- Total Active Clients
- Active Services (by status)
- Liabilities in Negotiation
- Pending Tasks (company-wide)

**Widgets:**
- Quick Actions: New Lead, New Task, View Reports
- Company Performance Summary (services by status)
- Recent Activity Feed (all company activity)
- Staff Workload Overview (tasks per staff member)
- Upcoming Deadlines (all litigation deadlines)

---

### 3. `src/components/dashboards/SalesRepDashboard.tsx`

Lead pipeline and conversion focused dashboard.

**Metrics:**
- My Active Leads (assigned to user)
- Leads by Status (new, contacted, qualified)
- Conversions This Month
- Follow-up Tasks Due

**Widgets:**
- Quick Actions: New Lead, Log Activity, View All Leads
- Lead Pipeline Summary (leads by stage)
- My Leads Requiring Follow-up
- Recent Lead Activities
- Conversion Rate Trend

---

### 4. `src/components/dashboards/NegotiatorDashboard.tsx`

Settlement-focused dashboard for negotiators.

**Metrics:**
- Liabilities in Negotiation
- Pending Settlements (offered, awaiting approval)
- Settlements Awaiting Approval
- Total Settlement Value This Month

**Widgets:**
- Quick Actions: View Liabilities, Create Settlement Offer
- Liabilities Ready for Negotiation
- Pending Settlement Offers (status: offered)
- Recent Settlement Activity
- Upcoming Payment Deadlines

---

### 5. `src/components/dashboards/PaymentProcessorDashboard.tsx`

Transaction and payment management dashboard.

**Metrics:**
- Transactions Due Today
- Pending Transactions
- Cleared This Month (volume)
- Failed/NSF Transactions

**Widgets:**
- Quick Actions: Process Transactions, View All Payments
- Transactions Due Today (list)
- Recently Cleared Transactions
- Failed Transactions Requiring Attention
- Monthly Volume Summary

---

### 6. `src/components/dashboards/CorrespondenceDashboard.tsx`

Communication and document management dashboard.

**Metrics:**
- Documents Uploaded This Week
- Communications Logged Today
- Pending Follow-ups
- My Tasks

**Widgets:**
- Quick Actions: Log Communication, Upload Document
- Recent Communications (timeline)
- Documents Requiring Review
- My Pending Tasks

---

### 7. `src/components/dashboards/ClientServicesRepDashboard.tsx`

Client engagement and retention focused dashboard.

**Metrics:**
- Active Clients (assigned)
- Services At Risk (retention flags)
- Communications This Week
- Follow-up Tasks Due

**Widgets:**
- Quick Actions: Log Communication, View Clients
- Clients Requiring Attention (retention issues)
- Recent Client Communications
- My Tasks
- Service Status Distribution

---

## Files to Modify

### `src/pages/Dashboard.tsx`

Update the role detection logic to route to appropriate dashboards.

**Changes:**
```typescript
// Extended role detection
const isAdmin = staff?.department === 'admin' || hasRole('admin');
const isSalesRep = staff?.department === 'sales_intake' || hasRole('sales_rep');
const isNegotiator = staff?.department === 'negotiations' || hasRole('negotiator');
const isPaymentProcessor = staff?.department === 'payment_processing' || hasRole('payment_processor');
const isCorrespondence = staff?.department === 'correspondence' || hasRole('correspondence');
const isClientServicesRep = staff?.department === 'client_services' && !isCaseManager;

// Show role-specific dashboards
if (isAdmin) return <AdminDashboard />;
if (isSalesRep) return <SalesRepDashboard />;
if (isNegotiator) return <NegotiatorDashboard />;
if (isPaymentProcessor) return <PaymentProcessorDashboard />;
if (isCorrespondence) return <CorrespondenceDashboard />;
if (isClientServicesRep) return <ClientServicesRepDashboard />;
// Existing: isAttorney, isCaseManager
```

---

## Dashboard UI Pattern

Each dashboard follows a consistent layout:

```text
+--------------------------------------------------+
| [Icon] Role Dashboard                            |
| Subtitle with context                  [Actions] |
+--------------------------------------------------+
| [Metric 1] | [Metric 2] | [Metric 3] | [Metric 4]|
+--------------------------------------------------+
| +-------------------+  +---------------------+   |
| | Widget 1          |  | Widget 2            |   |
| | (Primary Focus)   |  | (Secondary Focus)   |   |
| +-------------------+  +---------------------+   |
+--------------------------------------------------+
| +-------------------+  +---------------------+   |
| | Widget 3          |  | Widget 4            |   |
| | (Tasks/Activity)  |  | (Activity Feed)     |   |
| +-------------------+  +---------------------+   |
+--------------------------------------------------+
```

---

## Technical Details

### Existing Components to Reuse

- `DashboardMetricCard` - Metric display with variants (default, warning, success, destructive)
- `DeadlinesList` - Deadline/due date lists
- `RecentActivityFeed` - Activity timeline
- `Card`, `CardHeader`, `CardContent` - Widget containers
- `Button`, `Badge`, `Skeleton` - UI primitives

### Query Patterns

Each dashboard will use targeted queries with proper filtering:

```typescript
// Example: Count with filter
const { count } = await supabase
  .from('clients')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active');

// Example: List with limit
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('scheduled_date', today)
  .eq('status', 'open')
  .order('amount', { ascending: false })
  .limit(10);
```

### Performance Considerations

- Use `count: 'exact', head: true` for metric counts without fetching rows
- Limit list queries to 5-10 items
- Cache with React Query for fast re-renders
- Skeleton loading states for all async content

---

## Implementation Order

1. **Create `useDashboardStats.ts` hook** - Reusable stat queries for each role

2. **Create Admin Dashboard** - Company-wide metrics, staff workload, activity feed

3. **Create Sales Rep Dashboard** - Lead pipeline, conversion metrics, follow-up tracking

4. **Create Negotiator Dashboard** - Settlement workflow, liability pipeline, approval tracking

5. **Create Payment Processor Dashboard** - Transaction queue, processing metrics, volume tracking

6. **Create Correspondence Dashboard** - Communication logging, document tracking, tasks

7. **Create Client Services Rep Dashboard** - Client engagement, retention tracking, communications

8. **Update Dashboard.tsx** - Add role detection and routing for all roles

---

## Testing Checklist

After implementation:
- Log in as each role type and verify correct dashboard displays
- Verify metrics show accurate counts from database
- Test quick action buttons navigate correctly
- Confirm tasks and activities are correctly filtered to current user
- Test on mobile viewport for responsive layout
- Verify empty states display appropriately
- Check loading skeleton states during data fetch

