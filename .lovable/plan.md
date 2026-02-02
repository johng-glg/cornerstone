

# Phase 8: Reporting & Analytics - Implementation Plan

## Overview

This plan implements a comprehensive reporting system that allows users to generate, customize, and save reports from any module in the system. The reporting engine will support:

- **Pre-set Reports**: Lead conversion, debt settlement enrollment, settlements, revenue, caseload
- **Custom Reports**: Build reports from any data module with field selection and filters
- **Saved Templates**: Save and re-run report configurations
- **Export Options**: CSV and PDF exports
- **Visualizations**: Charts for trend analysis using recharts

---

## Database Schema

### New Table: `report_templates`

Stores saved report configurations for quick re-run.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Primary key |
| `company_id` | uuid (FK -> companies) | Company that owns this template |
| `created_by` | uuid (FK -> staff) | Staff member who created it |
| `name` | text | Template name |
| `description` | text | Optional description |
| `module` | text | Source module: leads, clients, services, liabilities, settlements, transactions, litigation |
| `config` | jsonb | Stored configuration: filters, columns, sort, chart type |
| `is_preset` | boolean | True for system-provided presets |
| `is_public` | boolean | True if shared with entire company |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Updated timestamp |

### Config JSONB Structure

```json
{
  "columns": ["first_name", "last_name", "status", "created_at"],
  "filters": [
    { "field": "status", "operator": "eq", "value": "converted" },
    { "field": "created_at", "operator": "gte", "value": "2025-01-01" }
  ],
  "sortBy": "created_at",
  "sortOrder": "desc",
  "dateRange": { "field": "created_at", "start": "2025-01-01", "end": "2025-12-31" },
  "groupBy": "status",
  "chartType": "bar"
}
```

### RLS Policy

```sql
CREATE POLICY "Staff can access company report templates"
ON report_templates FOR ALL
USING (can_access_company(auth.uid(), company_id));
```

---

## Pre-Set Reports

### 1. Lead Conversion Report

**Purpose**: Track lead pipeline and conversion metrics

**Data Source**: `leads` table

**Columns**:
- Lead Number, Name, Source, Status
- Created Date, Converted Date
- Assigned Rep, Estimated Debt

**Metrics**:
- Total Leads, Converted, Conversion Rate
- By Source breakdown, By Rep breakdown
- Days to Convert average

**Chart**: Funnel chart or bar chart by status

---

### 2. Enrollment Report

**Purpose**: Track debt settlement enrollments

**Data Source**: `client_services` table joined with `clients`

**Columns**:
- Service Number, Client Name
- Enrolled Date, Status
- Total Enrolled Debt, Monthly Payment
- Program Type, Term Months

**Metrics**:
- Total Enrollments, Active Services
- Total Enrolled Debt Volume
- Average Monthly Payment
- Enrollments by Month trend

**Chart**: Line chart of enrollments over time

---

### 3. Settlement Report

**Purpose**: Track settlement offers and completions

**Data Source**: `settlements` table joined with `liabilities`, `client_services`

**Columns**:
- Client Name, Service Number
- Creditor, Original Balance, Enrolled Balance
- Offer Amount, Offer Percentage
- Status, Offered Date, Accepted Date

**Metrics**:
- Total Settlements, By Status
- Total Value Settled
- Average Settlement Percentage
- Settlement Volume by Month

**Chart**: Bar chart by status, line chart for trends

---

### 4. Revenue Report

**Purpose**: Track fee collection and revenue

**Data Source**: `transactions` table where type = contingency_fee

**Columns**:
- Transaction Date, Client Name, Service Number
- Amount, Status
- Settlement Reference

**Metrics**:
- Total Revenue Collected
- Pending Revenue (scheduled fees)
- Revenue by Month

**Chart**: Bar chart of monthly revenue

---

### 5. Caseload Report

**Purpose**: Track staff assignments and workload

**Data Source**: `client_services`, `tasks`, `litigation_matters` with staff joins

**Columns**:
- Staff Name, Department
- Active Services Assigned
- Open Tasks
- Litigation Matters

**Metrics**:
- Total Active Services
- Tasks per Staff Member
- Litigation per Attorney

**Chart**: Horizontal bar chart of workload distribution

---

## Module Configuration

Each reportable module has its own field definitions:

### Leads Module
```typescript
{
  module: 'leads',
  displayName: 'Leads',
  table: 'leads',
  columns: [
    { key: 'lead_number', label: 'Lead #', type: 'text' },
    { key: 'first_name', label: 'First Name', type: 'text' },
    { key: 'last_name', label: 'Last Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'source', label: 'Source', type: 'enum' },
    { key: 'status', label: 'Status', type: 'enum' },
    { key: 'estimated_debt_amount', label: 'Est. Debt', type: 'currency' },
    { key: 'assigned_to', label: 'Assigned To', type: 'staff' },
    { key: 'created_at', label: 'Created', type: 'datetime' },
    { key: 'converted_at', label: 'Converted', type: 'datetime' },
  ],
  filters: [
    { key: 'status', label: 'Status', type: 'enum', options: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
    { key: 'source', label: 'Source', type: 'enum', options: ['web_form', 'phone', 'referral', 'marketing'] },
    { key: 'assigned_to', label: 'Assigned To', type: 'staff' },
  ],
  dateFields: ['created_at', 'converted_at'],
}
```

Similar configurations for: Services, Clients, Liabilities, Settlements, Transactions, Litigation

---

## Files to Create

### 1. `src/pages/Reports.tsx`

Main reports page replacing the placeholder.

**Layout**:
```text
+----------------------------------------------------------+
| Reports                                    [New Report]   |
+----------------------------------------------------------+
| Tabs: [Pre-set Reports] [Saved Reports] [Build Custom]   |
+----------------------------------------------------------+
|                                                           |
| Pre-set Reports Tab:                                     |
| +-------------+ +-------------+ +-------------+           |
| | Lead        | | Enrollment  | | Settlement  |           |
| | Conversion  | | Report      | | Report      |           |
| +-------------+ +-------------+ +-------------+           |
| +-------------+ +-------------+                           |
| | Revenue     | | Caseload    |                           |
| | Report      | | Report      |                           |
| +-------------+ +-------------+                           |
|                                                           |
| Saved Reports Tab:                                        |
| [Table of saved templates with Run/Edit/Delete actions]   |
|                                                           |
| Build Custom Tab:                                         |
| [Report Builder Interface]                                |
+----------------------------------------------------------+
```

---

### 2. `src/components/reports/ReportBuilder.tsx`

Custom report builder component.

**Features**:
- Module selector dropdown
- Column picker (multi-select checkboxes)
- Filter builder (add/remove filter rows)
- Date range picker
- Sort configuration
- Chart type selector (optional)
- Preview and Run buttons

---

### 3. `src/components/reports/ReportPreview.tsx`

Report preview and results display.

**Features**:
- Summary metrics at top
- Data table with sortable columns
- Chart visualization (if configured)
- Pagination for large datasets
- Export buttons (CSV, PDF)

---

### 4. `src/components/reports/ReportFilters.tsx`

Reusable filter builder component.

**Filter Types**:
- Text: contains, equals
- Number: equals, gt, lt, gte, lte, between
- Date: equals, before, after, between
- Enum: select from options
- Staff: staff picker dropdown

---

### 5. `src/components/reports/ReportChart.tsx`

Chart wrapper component using recharts.

**Chart Types**:
- Bar Chart (vertical/horizontal)
- Line Chart (trends)
- Pie Chart (distributions)
- Stacked Bar (comparisons)

---

### 6. `src/components/reports/SaveReportDialog.tsx`

Dialog to save current report configuration as template.

**Fields**:
- Name (required)
- Description (optional)
- Public toggle (share with company)

---

### 7. `src/components/reports/PresetReportCard.tsx`

Card component for pre-set reports on the main page.

**Display**:
- Report name and icon
- Brief description
- "Run Report" button

---

### 8. `src/hooks/useReportTemplates.ts`

CRUD operations for report templates.

**Functions**:
- `useReportTemplates()` - Fetch all templates for company
- `usePresetReports()` - Fetch built-in presets
- `useSaveReportTemplate()` - Save new template
- `useUpdateReportTemplate()` - Update existing
- `useDeleteReportTemplate()` - Delete template

---

### 9. `src/hooks/useReportData.ts`

Dynamic data fetching for reports.

**Function**:
```typescript
function useReportData(config: ReportConfig) {
  // Build Supabase query dynamically based on:
  // - Selected module/table
  // - Selected columns
  // - Applied filters
  // - Date range
  // - Sort order
  // Returns paginated data and aggregate counts
}
```

---

### 10. `src/lib/reportModules.ts`

Module definitions and field configurations.

**Exports**:
- `REPORT_MODULES` - Array of module configurations
- `getModuleConfig(moduleKey)` - Get config by key
- `getColumnLabel(moduleKey, columnKey)` - Get human-readable label
- `getFilterOperators(fieldType)` - Get valid operators for field type

---

### 11. `src/lib/reportExport.ts`

Export utilities for CSV and PDF.

**Functions**:
```typescript
function exportToCSV(data: any[], columns: ColumnConfig[], filename: string)
function exportToPDF(data: any[], columns: ColumnConfig[], title: string, filters: string)
```

---

## Files to Modify

### 1. `src/App.tsx`

Replace placeholder ReportsPage with actual import.

**Changes**:
```typescript
// Remove inline placeholder
// const ReportsPage = () => <div>...</div>;

// Import actual page
import ReportsPage from "./pages/Reports";
```

---

## Report Builder UI Flow

### Step 1: Select Module

User chooses from dropdown:
- Leads
- Clients
- Services (Client Services)
- Liabilities
- Settlements
- Transactions
- Litigation Matters

---

### Step 2: Select Columns

Checkbox list of available fields for chosen module. Pre-selects commonly used columns.

---

### Step 3: Add Filters (Optional)

Build filter expressions:

```text
+------------------------------------------+
| [Field v] [Operator v] [Value      ] [X] |
| [+ Add Filter]                           |
+------------------------------------------+
```

---

### Step 4: Date Range (Optional)

If module has date fields:

```text
Date Field: [Created Date v]
From: [________] To: [________]
```

---

### Step 5: Configure Chart (Optional)

```text
Include Chart: [x]
Chart Type: [Bar v]
Group By: [Status v]
Value: [Count | Sum of Amount v]
```

---

### Step 6: Run or Save

- "Preview" - Shows first 10 rows
- "Run Report" - Executes full query
- "Save as Template" - Opens save dialog

---

## Export Formats

### CSV Export

- Uses browser Blob API
- Includes header row with column labels
- Properly escapes values with commas/quotes
- Filename: `{report-name}-{date}.csv`

### PDF Export (Future Enhancement)

Using a library like `jspdf` or `@react-pdf/renderer`:
- Company header
- Report title and date range
- Filter summary
- Data table
- Chart (if applicable)

---

## Technical Considerations

### Dynamic Query Building

```typescript
// Build query based on config
let query = supabase.from(config.table).select(config.columns.join(','));

// Apply filters
config.filters.forEach(f => {
  if (f.operator === 'eq') query = query.eq(f.field, f.value);
  if (f.operator === 'gt') query = query.gt(f.field, f.value);
  // ... etc
});

// Apply date range
if (config.dateRange) {
  query = query.gte(config.dateRange.field, config.dateRange.start);
  query = query.lte(config.dateRange.field, config.dateRange.end);
}

// Apply sort
query = query.order(config.sortBy, { ascending: config.sortOrder === 'asc' });
```

### Pagination

- Use `range()` for pagination
- Default page size: 50 rows
- "Load More" or pagination controls

### Performance

- Limit result sets to 1000 rows by default
- Use count queries for totals
- Cache templates with React Query

---

## Implementation Order

1. **Database Migration**
   - Create `report_templates` table
   - Add RLS policy
   - Seed preset report configurations

2. **Module Definitions**
   - Create `src/lib/reportModules.ts`
   - Define all module configurations

3. **Hooks**
   - Create `useReportTemplates.ts`
   - Create `useReportData.ts`

4. **Export Utilities**
   - Create `src/lib/reportExport.ts`

5. **UI Components**
   - Create `ReportFilters.tsx`
   - Create `ReportChart.tsx`
   - Create `PresetReportCard.tsx`
   - Create `ReportBuilder.tsx`
   - Create `ReportPreview.tsx`
   - Create `SaveReportDialog.tsx`

6. **Main Page**
   - Create `src/pages/Reports.tsx`
   - Wire up all components
   - Implement tab navigation

7. **Update App.tsx**
   - Remove placeholder
   - Import actual Reports page

---

## Pre-Set Report Templates (Seeded Data)

The following templates will be inserted during migration:

```sql
INSERT INTO report_templates (company_id, name, description, module, config, is_preset, is_public)
VALUES
  (NULL, 'Lead Conversion Report', 'Track lead pipeline and conversion rates', 'leads', 
   '{"columns":["lead_number","first_name","last_name","source","status","created_at","converted_at"],...}', 
   true, true),
  (NULL, 'Enrollment Report', 'Track debt settlement enrollments', 'services', 
   '{"columns":["service_number","primary_client","enrolled_date","status","total_enrolled_debt"],...}', 
   true, true),
  -- ... other presets
;
```

---

## Testing Checklist

After implementation:
- Run each pre-set report and verify data accuracy
- Build a custom report with multiple filters
- Save a report template and verify it persists
- Re-run a saved template and confirm filters apply
- Export a report to CSV and verify formatting
- Test chart visualization with different chart types
- Verify reports respect company RLS boundaries
- Test with large datasets (1000+ rows)
- Verify pagination works correctly
- Test on mobile viewport

