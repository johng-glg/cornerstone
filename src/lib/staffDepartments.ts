import type { Enums } from '@/integrations/supabase/types';

// New consolidated department type (matches database enum)
export type Department = 'administration' | 'legal' | 'negotiations' | 'sales' | 'client_services' | 'operations';

// Map roles to their corresponding consolidated departments
export const roleToDepartment: Record<Enums<'app_role'>, Department> = {
  admin: 'administration',
  viewer: 'administration',
  attorney: 'legal',
  paralegal: 'legal',
  case_manager: 'legal',
  negotiator: 'negotiations',
  sales_rep: 'sales',
  client_services_rep: 'client_services',
  payment_processor: 'operations',
  correspondent: 'operations',
};

// Department display labels
export const DEPARTMENT_LABELS: Record<Department, string> = {
  administration: 'Administration',
  legal: 'Legal',
  negotiations: 'Negotiations',
  sales: 'Sales',
  client_services: 'Client Services',
  operations: 'Operations',
};

// Department display order for grouped views
export const DEPARTMENT_ORDER: Department[] = [
  'administration',
  'legal',
  'negotiations',
  'sales',
  'client_services',
  'operations',
];

// Department colors for badges
export const DEPARTMENT_COLORS: Record<Department, string> = {
  administration: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  legal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  negotiations: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  sales: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  client_services: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  operations: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

// Helper to get department from a role
export function getDepartmentForRole(role: Enums<'app_role'>): Department {
  return roleToDepartment[role];
}

// Helper to format department for display
export function formatDepartment(dept: Department | string): string {
  return DEPARTMENT_LABELS[dept as Department] || dept.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
