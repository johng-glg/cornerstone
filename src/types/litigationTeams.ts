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

// Eligible departments for litigation teams
export const ELIGIBLE_DEPARTMENTS = ['attorney', 'case_manager', 'negotiations'] as const;
export type EligibleDepartment = typeof ELIGIBLE_DEPARTMENTS[number];

// Role display configuration
export const ROLE_CONFIG: Record<EligibleDepartment, { label: string; color: string; bgColor: string; order: number }> = {
  attorney: {
    label: 'Attorney',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    order: 1,
  },
  case_manager: {
    label: 'Case Manager',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    order: 2,
  },
  negotiations: {
    label: 'Negotiator',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    order: 3,
  },
};

// Sort function for role hierarchy
export function sortByRoleHierarchy<T extends { staff: { department: string } }>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const orderA = ROLE_CONFIG[a.staff.department as EligibleDepartment]?.order ?? 99;
    const orderB = ROLE_CONFIG[b.staff.department as EligibleDepartment]?.order ?? 99;
    return orderA - orderB;
  });
}
