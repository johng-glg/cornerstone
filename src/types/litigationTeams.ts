import type { Tables } from '@/integrations/supabase/types';

export type LitigationTeam = Tables<'litigation_teams'>;
export type LitigationTeamMember = Tables<'litigation_team_members'>;

export interface LitigationTeamWithMembers extends LitigationTeam {
  members: LitigationTeamMemberWithStaff[];
  member_count: number;
}

export interface LitigationTeamMemberWithStaff extends LitigationTeamMember {
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
    job_title: string | null;
    avatar_url: string | null;
    email: string;
  };
}

// Eligible departments for litigation teams (using new consolidated departments)
export const ELIGIBLE_DEPARTMENTS = ['legal', 'negotiations'] as const;
export type EligibleDepartment = typeof ELIGIBLE_DEPARTMENTS[number];

// Role display configuration for litigation team members
export const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; order: number }> = {
  attorney: {
    label: 'Attorney',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    order: 1,
  },
  paralegal: {
    label: 'Paralegal',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    order: 2,
  },
  case_manager: {
    label: 'Case Manager',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    order: 3,
  },
  negotiator: {
    label: 'Negotiator',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    order: 4,
  },
};

// Sort function for role hierarchy based on user role (from user_roles table)
export function sortByRoleHierarchy<T extends { staff: { department: string } }>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    // For now, sort by department - legal first, then negotiations
    const deptOrder = { legal: 1, negotiations: 2 };
    const orderA = deptOrder[a.staff.department as keyof typeof deptOrder] ?? 99;
    const orderB = deptOrder[b.staff.department as keyof typeof deptOrder] ?? 99;
    return orderA - orderB;
  });
}
