// Lead Assignment Engine Types

export type AssignmentMethod = 'round_robin' | 'weighted' | 'backlog_based' | 'skillset_match';
export type QueueStatus = 'pending' | 'assigned' | 'expired' | 'manual';
export type AssignmentAction = 'auto_assigned' | 'manual_assigned' | 'reassigned' | 'unassigned' | 'queue_added' | 'queue_expired';

export interface AssignmentRuleConfig {
  auto_assign?: boolean;
  max_active_leads?: number;
  fallback_method?: AssignmentMethod;
  work_hours_only?: boolean;
  work_hours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
    timezone: string;
  };
}

export interface AssignmentRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  method: AssignmentMethod;
  is_active: boolean;
  is_default: boolean;
  source: string | null;
  interest_type: string | null;
  min_debt_amount: number | null;
  max_debt_amount: number | null;
  config: AssignmentRuleConfig;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface PoolMemberSkill {
  type: 'interest_type' | 'debt_range' | 'has_lawsuit' | 'high_value';
  value?: string | boolean;
  min?: number;
  max?: number;
  proficiency?: number;
}

export interface AssignmentPoolMember {
  id: string;
  rule_id: string;
  staff_id: string;
  weight: number;
  max_active_leads: number | null;
  is_available: boolean;
  skills: PoolMemberSkill[];
  last_assigned_at: string | null;
  assignment_count: number;
  created_at: string;
  updated_at: string;
  // Joined staff data
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface AssignmentQueueItem {
  id: string;
  lead_id: string;
  rule_id: string | null;
  status: QueueStatus;
  priority: number;
  queued_at: string;
  assigned_at: string | null;
  assigned_to: string | null;
  assignment_method: AssignmentMethod | null;
  assignment_reason: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  created_at: string;
  // Joined lead data
  lead?: {
    id: string;
    first_name: string;
    last_name: string;
    lead_number: string;
    source: string;
    interest_type: string;
    lead_score: number | null;
  };
}

export interface AssignmentLogEntry {
  id: string;
  lead_id: string;
  action: AssignmentAction;
  from_staff_id: string | null;
  to_staff_id: string | null;
  performed_by: string | null;
  rule_id: string | null;
  method: AssignmentMethod | null;
  reason: string | null;
  created_at: string;
  // Joined staff data
  from_staff?: {
    first_name: string;
    last_name: string;
  };
  to_staff?: {
    first_name: string;
    last_name: string;
  };
  performed_by_staff?: {
    first_name: string;
    last_name: string;
  };
}

export interface AssignLeadResult {
  assigned_to: string | null;
  method: AssignmentMethod | null;
  reason: string;
}

// Display labels for UI
export const ASSIGNMENT_METHOD_LABELS: Record<AssignmentMethod, string> = {
  round_robin: 'Round Robin',
  weighted: 'Weighted Distribution',
  backlog_based: 'Load Balanced',
  skillset_match: 'Skillset Match',
};

export const ASSIGNMENT_METHOD_DESCRIPTIONS: Record<AssignmentMethod, string> = {
  round_robin: 'Assigns leads sequentially to available reps, cycling through the pool',
  weighted: 'Assigns based on configured weight per rep (e.g., senior reps get more leads)',
  backlog_based: 'Assigns to the rep with the fewest active leads',
  skillset_match: 'Matches lead characteristics to rep skills',
};

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  expired: 'Expired',
  manual: 'Manual',
};

export const ASSIGNMENT_ACTION_LABELS: Record<AssignmentAction, string> = {
  auto_assigned: 'Auto Assigned',
  manual_assigned: 'Manually Assigned',
  reassigned: 'Reassigned',
  unassigned: 'Unassigned',
  queue_added: 'Added to Queue',
  queue_expired: 'Queue Expired',
};
