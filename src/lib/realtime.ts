/**
 * Realtime configuration and utilities
 * 
 * Tables enabled for realtime:
 * - tasks: Kanban boards, assignments, status updates
 * - leads: Lead pipeline/kanban updates
 * - lead_activities: Activity timelines on lead sheets
 * - client_communications: Prevent duplicate outreach
 * - litigation_activities: Legal team synchronization
 * - service_status_history: Status change feeds
 */

// Tables that have realtime enabled
export const REALTIME_TABLES = [
  'tasks',
  'leads',
  'lead_activities',
  'client_communications',
  'litigation_activities',
  'service_status_history',
] as const;

export type RealtimeTable = typeof REALTIME_TABLES[number];

// Helper to check if a table has realtime enabled
export function isRealtimeEnabled(table: string): table is RealtimeTable {
  return REALTIME_TABLES.includes(table as RealtimeTable);
}

// Default realtime options for common use cases
export const REALTIME_DEFAULTS = {
  // For list views with toasts
  listWithToasts: {
    enabled: true,
    showToasts: true,
  },
  // For list views without toasts (background sync)
  listSilent: {
    enabled: true,
    showToasts: false,
  },
  // For detail views
  detail: {
    enabled: true,
  },
} as const;
