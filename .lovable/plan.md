
# Lead Source Metrics Implementation Plan

## Overview

This feature implements comprehensive analytics for tracking lead performance by source and sales rep. It provides key conversion funnel metrics, retention tracking, and visual dashboards to identify which sources and reps are most effective.

---

## Key Metrics to Track

### By Lead Source
| Metric | Definition | Calculation |
|--------|------------|-------------|
| **Contact Ratio** | % of leads that were contacted | `contacted_at IS NOT NULL / total leads` |
| **Credit Pull Ratio** | % of leads with credit authorization | `credit_auth_given = true / total leads` |
| **Qualification Ratio** | % of leads that reached qualified status | `qualified_at IS NOT NULL / contacted leads` |
| **Conversion Ratio** | % of leads that converted to clients | `status = 'converted' / total leads` |
| **Lost Ratio** | % of leads marked as lost | `status = 'lost' / total leads` |
| **First Draft Clear Rate** | % of converted leads with successful first payment | Requires joining to `transactions` via `converted_service_id` |
| **Retention Rate** | % of converted leads still active after N months | Requires tracking service status over time |

### By Sales Rep
| Metric | Definition | Calculation |
|--------|------------|-------------|
| **Total Assigned** | Leads assigned to rep | `COUNT where assigned_to = rep_id` |
| **Contact Rate** | Rep's personal contact efficiency | `contacted / assigned` |
| **Conversion Rate** | Rep's personal close rate | `converted / assigned` |
| **Avg Time to Contact** | Speed of first contact | `AVG(contacted_at - created_at)` |
| **Avg Time to Convert** | Full sales cycle length | `AVG(converted_at - created_at)` |

---

## Database Approach

Two PostgreSQL views (not materialized tables) for real-time accuracy with caching via React Query.

### View 1: `lead_source_metrics`

```sql
CREATE OR REPLACE VIEW lead_source_metrics AS
SELECT
  source,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END) as contacted_count,
  COUNT(CASE WHEN credit_auth_given = true THEN 1 END) as credit_pull_count,
  COUNT(CASE WHEN qualified_at IS NOT NULL THEN 1 END) as qualified_count,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_count,
  -- Ratios as decimals (multiply by 100 in UI for %)
  ROUND(
    COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0), 4
  ) as contact_ratio,
  ROUND(
    COUNT(CASE WHEN credit_auth_given = true THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0), 4
  ) as credit_pull_ratio,
  ROUND(
    COUNT(CASE WHEN qualified_at IS NOT NULL THEN 1 END)::numeric / 
    NULLIF(COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END), 0), 4
  ) as qualification_ratio,
  ROUND(
    COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0), 4
  ) as conversion_ratio
FROM leads
GROUP BY source;
```

### View 2: `lead_rep_metrics`

```sql
CREATE OR REPLACE VIEW lead_rep_metrics AS
SELECT
  l.assigned_to as staff_id,
  s.first_name,
  s.last_name,
  s.avatar_url,
  COUNT(*) as total_assigned,
  COUNT(CASE WHEN l.contacted_at IS NOT NULL THEN 1 END) as contacted_count,
  COUNT(CASE WHEN l.credit_auth_given = true THEN 1 END) as credit_pull_count,
  COUNT(CASE WHEN l.qualified_at IS NOT NULL THEN 1 END) as qualified_count,
  COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_count,
  COUNT(CASE WHEN l.status = 'lost' THEN 1 END) as lost_count,
  -- Ratios
  ROUND(
    COUNT(CASE WHEN l.contacted_at IS NOT NULL THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0), 4
  ) as contact_ratio,
  ROUND(
    COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0), 4
  ) as conversion_ratio,
  -- Time metrics (in hours)
  ROUND(
    AVG(EXTRACT(EPOCH FROM (l.contacted_at - l.created_at)) / 3600)::numeric, 2
  ) as avg_hours_to_contact,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (l.converted_at - l.created_at)) / 86400)::numeric, 2
  ) as avg_days_to_convert
FROM leads l
LEFT JOIN staff s ON l.assigned_to = s.id
WHERE l.assigned_to IS NOT NULL
GROUP BY l.assigned_to, s.first_name, s.last_name, s.avatar_url;
```

### RLS Consideration

Views inherit RLS from underlying tables. Since `leads` has RLS based on `company_id`, the views will automatically filter by company.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useLeadMetrics.ts` | React Query hooks for fetching source and rep metrics |
| `src/pages/LeadMetrics.tsx` | Main metrics dashboard page |
| `src/components/leads/LeadSourceMetricsCard.tsx` | Card showing metrics for one source |
| `src/components/leads/LeadRepMetricsTable.tsx` | Table of rep performance |
| `src/components/leads/LeadFunnelChart.tsx` | Funnel visualization for conversion flow |
| `src/components/leads/MetricsDateFilter.tsx` | Date range filter for metrics |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route for `/leads/metrics` |
| `src/components/layout/AppSidebar.tsx` | Add "Lead Metrics" nav item under Leads |
| `src/components/dashboards/SalesRepDashboard.tsx` | Add source metrics widget |
| `src/components/dashboards/AdminDashboard.tsx` | Add source/rep metrics summary |
| `src/lib/docs/roadmapData.ts` | Mark feature as Completed |

---

## Implementation Details

### 1. Database Migration

Create both views in a single migration:

```sql
-- Lead Source Metrics View
CREATE OR REPLACE VIEW lead_source_metrics AS
SELECT
  source,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END) as contacted_count,
  COUNT(CASE WHEN credit_auth_given = true THEN 1 END) as credit_pull_count,
  COUNT(CASE WHEN qualified_at IS NOT NULL THEN 1 END) as qualified_count,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_count,
  ROUND(COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as contact_ratio,
  ROUND(COUNT(CASE WHEN credit_auth_given = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as credit_pull_ratio,
  ROUND(COUNT(CASE WHEN qualified_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END), 0), 4) as qualification_ratio,
  ROUND(COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as conversion_ratio
FROM leads
GROUP BY source;

-- Lead Rep Metrics View
CREATE OR REPLACE VIEW lead_rep_metrics AS
SELECT
  l.assigned_to as staff_id,
  s.first_name,
  s.last_name,
  s.avatar_url,
  COUNT(*) as total_assigned,
  COUNT(CASE WHEN l.contacted_at IS NOT NULL THEN 1 END) as contacted_count,
  COUNT(CASE WHEN l.credit_auth_given = true THEN 1 END) as credit_pull_count,
  COUNT(CASE WHEN l.qualified_at IS NOT NULL THEN 1 END) as qualified_count,
  COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_count,
  COUNT(CASE WHEN l.status = 'lost' THEN 1 END) as lost_count,
  ROUND(COUNT(CASE WHEN l.contacted_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as contact_ratio,
  ROUND(COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as conversion_ratio,
  ROUND(AVG(EXTRACT(EPOCH FROM (l.contacted_at - l.created_at)) / 3600)::numeric, 2) as avg_hours_to_contact,
  ROUND(AVG(EXTRACT(EPOCH FROM (l.converted_at - l.created_at)) / 86400)::numeric, 2) as avg_days_to_convert
FROM leads l
LEFT JOIN staff s ON l.assigned_to = s.id
WHERE l.assigned_to IS NOT NULL
GROUP BY l.assigned_to, s.first_name, s.last_name, s.avatar_url;
```

### 2. React Query Hooks

**`src/hooks/useLeadMetrics.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadSourceMetric {
  source: string;
  total_leads: number;
  contacted_count: number;
  credit_pull_count: number;
  qualified_count: number;
  converted_count: number;
  lost_count: number;
  contact_ratio: number;
  credit_pull_ratio: number;
  qualification_ratio: number;
  conversion_ratio: number;
}

export interface LeadRepMetric {
  staff_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  total_assigned: number;
  contacted_count: number;
  credit_pull_count: number;
  qualified_count: number;
  converted_count: number;
  lost_count: number;
  contact_ratio: number;
  conversion_ratio: number;
  avg_hours_to_contact: number | null;
  avg_days_to_convert: number | null;
}

export function useLeadSourceMetrics() {
  return useQuery({
    queryKey: ['lead_source_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_source_metrics')
        .select('*');
      if (error) throw error;
      return data as LeadSourceMetric[];
    },
  });
}

export function useLeadRepMetrics() {
  return useQuery({
    queryKey: ['lead_rep_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_rep_metrics')
        .select('*')
        .order('total_assigned', { ascending: false });
      if (error) throw error;
      return data as LeadRepMetric[];
    },
  });
}
```

### 3. Metrics Dashboard Page

**`src/pages/LeadMetrics.tsx`**

Layout structure:
- Header with title and description
- Summary cards row (total leads, avg conversion rate, best source, best rep)
- Tabs: "By Source" | "By Rep" | "Funnel"
- By Source tab: Grid of LeadSourceMetricsCard components
- By Rep tab: LeadRepMetricsTable with sortable columns
- Funnel tab: LeadFunnelChart visualization

### 4. Source Metrics Card Component

**`src/components/leads/LeadSourceMetricsCard.tsx`**

Visual card for each lead source showing:
- Source name with icon
- Total leads count
- Mini progress bars for each ratio (contact, credit pull, conversion)
- Trend indicator (if implementing historical comparison)

### 5. Rep Metrics Table

**`src/components/leads/LeadRepMetricsTable.tsx`**

Sortable table with columns:
- Avatar + Name
- Total Assigned
- Contact Rate (as %)
- Credit Pull Rate (as %)  
- Conversion Rate (as %)
- Avg Time to Contact
- Avg Time to Convert

Color-coded cells (green for high performers, yellow for average, red for low).

### 6. Funnel Chart

**`src/components/leads/LeadFunnelChart.tsx`**

Using Recharts to visualize the conversion funnel:
- Total Leads
- Contacted
- Credit Auth
- Qualified
- Converted

Shows drop-off at each stage with percentages.

---

## UI Preview

### Source Metrics Cards

```text
+---------------------------+  +---------------------------+
|  WEB FORM                 |  |  REFERRAL                 |
|  Total: 156 leads         |  |  Total: 89 leads          |
|                           |  |                           |
|  Contact Rate    ████░ 78%|  |  Contact Rate    █████ 92%|
|  Credit Pull     ███░░ 62%|  |  Credit Pull     ████░ 81%|
|  Conversion      ██░░░ 34%|  |  Conversion      ████░ 71%|
+---------------------------+  +---------------------------+
```

### Rep Leaderboard

```text
+--------+----------------+--------+----------+--------+------------+
| Avatar | Name           | Leads  | Contact  | Conv.  | Avg Days   |
+--------+----------------+--------+----------+--------+------------+
|  👤    | Matt Smith     | 42     | 95%      | 68%    | 4.2 days   |
|  👤    | Joe Johnson    | 38     | 89%      | 52%    | 5.8 days   |
|  👤    | Sarah Williams | 35     | 91%      | 61%    | 3.9 days   |
+--------+----------------+--------+----------+--------+------------+
```

---

## Dashboard Integration

### SalesRepDashboard Enhancement

Add a compact "My Performance" card showing the current rep's metrics compared to team average:

```typescript
<Card>
  <CardHeader>
    <CardTitle>My Performance</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      <MetricComparison 
        label="Contact Rate" 
        myValue={85} 
        teamAvg={78} 
      />
      <MetricComparison 
        label="Conversion Rate" 
        myValue={42} 
        teamAvg={38} 
      />
    </div>
  </CardContent>
</Card>
```

### AdminDashboard Enhancement

Add a "Top Sources This Month" widget and "Rep Leaderboard" snippet.

---

## Navigation

Add to `AppSidebar.tsx` under the Leads section:

```typescript
{
  title: 'Lead Metrics',
  href: '/leads/metrics',
  icon: BarChart3,
}
```

---

## Files Summary

### Create (5 files)

| File | Purpose |
|------|---------|
| `src/hooks/useLeadMetrics.ts` | Hooks for source and rep metrics |
| `src/pages/LeadMetrics.tsx` | Main metrics dashboard |
| `src/components/leads/LeadSourceMetricsCard.tsx` | Source metric card component |
| `src/components/leads/LeadRepMetricsTable.tsx` | Rep performance table |
| `src/components/leads/LeadFunnelChart.tsx` | Conversion funnel chart |

### Modify (4 files)

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/leads/metrics` route |
| `src/components/layout/AppSidebar.tsx` | Add Lead Metrics nav item |
| `src/components/dashboards/SalesRepDashboard.tsx` | Add personal performance widget |
| `src/lib/docs/roadmapData.ts` | Mark as Completed |

### Database Migration (1)

Create `lead_source_metrics` and `lead_rep_metrics` views.

---

## Future Enhancements

After initial implementation:

1. **Date Range Filtering**: Add date pickers to filter metrics by time period
2. **First Draft Clear Rate**: Join to transactions table to track payment success
3. **Retention Tracking**: Track service status at 30/60/90 day marks
4. **Export to CSV/PDF**: Add export functionality for reports
5. **Historical Trends**: Store periodic snapshots for trend analysis
6. **Source ROI**: If marketing spend data is available, calculate cost per conversion
