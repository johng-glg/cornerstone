// Billing entry type definitions

export type BillingEntryType = 'time' | 'expense';
export type BillingEntryStatus = 'draft' | 'approved' | 'invoiced' | 'paid';

export interface BillingEntry {
  id: string;
  company_id: string;
  staff_id: string;
  client_id: string | null;
  client_service_id: string | null;
  litigation_matter_id: string | null;
  entry_type: BillingEntryType;
  description: string;
  billing_date: string;
  duration_minutes: number | null;
  hourly_rate: number | null;
  expense_amount: number | null;
  total_amount: number;
  is_billable: boolean;
  status: BillingEntryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
  } | null;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  litigation_matter?: {
    id: string;
    case_number: string | null;
    status: string;
  } | null;
}

export type BillingEntryInsert = Omit<BillingEntry, 'id' | 'created_at' | 'updated_at' | 'staff' | 'client' | 'litigation_matter'>;
export type BillingEntryUpdate = Partial<BillingEntryInsert>;

export const BILLING_ENTRY_TYPE_LABELS: Record<BillingEntryType, string> = {
  time: 'Time Entry',
  expense: 'Expense',
};

export const BILLING_ENTRY_STATUS_LABELS: Record<BillingEntryStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  invoiced: 'Invoiced',
  paid: 'Paid',
};

export const BILLING_ENTRY_STATUS_COLORS: Record<BillingEntryStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  invoiced: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

// Common expense types for quick selection
export const COMMON_EXPENSE_TYPES = [
  'Filing Fee',
  'Court Fee',
  'Service of Process',
  'Deposition Fee',
  'Expert Witness Fee',
  'Travel Expense',
  'Copying/Printing',
  'Postage',
  'Messenger Service',
  'Research Database',
  'Other',
];

// Helper to format duration for display (e.g., "2h 30m")
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Helper to parse duration string to minutes (e.g., "2:30" or "2.5" -> 150)
export function parseDuration(input: string): number | null {
  // Handle HH:MM format
  if (input.includes(':')) {
    const [hours, mins] = input.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(mins)) {
      return hours * 60 + mins;
    }
  }
  // Handle decimal hours (e.g., 2.5 = 2h 30m)
  const decimal = parseFloat(input);
  if (!isNaN(decimal)) {
    return Math.round(decimal * 60);
  }
  return null;
}
