import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { addDays, startOfDay } from 'date-fns';
import type { Task } from '@/hooks/useTasks';

export interface UserActivity {
  id: string;
  type: 'task' | 'lead_activity' | 'status_change' | 'document';
  message: string;
  timestamp: string;
  entityId?: string;
  entityType?: string;
}

// Fetch tasks assigned to the current user that are urgent or due soon
export function useUserUrgentTasks() {
  const { staff } = useAuth();
  
  return useQuery({
    queryKey: ['user_urgent_tasks', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return [];
      
      const tomorrow = addDays(startOfDay(new Date()), 2);
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_staff:staff!tasks_assigned_to_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress'])
        .or(`priority.eq.urgent,priority.eq.high,due_date.lte.${tomorrow.toISOString()}`)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!staff?.id,
  });
}

// Fetch recent activities related to the current user
export function useUserRecentActivity() {
  const { staff } = useAuth();
  
  return useQuery({
    queryKey: ['user_recent_activity', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return [];
      
      const activities: UserActivity[] = [];
      
      // Get tasks created by or assigned to this user (recently updated)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, updated_at, completed_at')
        .or(`assigned_to.eq.${staff.id},created_by.eq.${staff.id}`)
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (tasks) {
        tasks.forEach(task => {
          const timestamp = task.completed_at || task.updated_at;
          activities.push({
            id: `task-${task.id}`,
            type: 'task',
            message: task.status === 'completed' 
              ? `Completed task: ${task.title}`
              : `Task updated: ${task.title}`,
            timestamp,
            entityId: task.id,
            entityType: 'task',
          });
        });
      }
      
      // Get lead activities by this user
      const { data: leadActivities } = await supabase
        .from('lead_activities')
        .select(`
          id, 
          activity_type, 
          notes, 
          created_at,
          lead:leads!lead_id(first_name, last_name)
        `)
        .eq('staff_id', staff.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (leadActivities) {
        leadActivities.forEach((activity: any) => {
          const leadName = activity.lead 
            ? `${activity.lead.first_name} ${activity.lead.last_name}`
            : 'Unknown Lead';
          activities.push({
            id: `lead-${activity.id}`,
            type: 'lead_activity',
            message: `${activity.activity_type} with ${leadName}`,
            timestamp: activity.created_at,
            entityType: 'lead',
          });
        });
      }
      
      // Get litigation activities by this user
      const { data: litigationActivities } = await supabase
        .from('litigation_activities')
        .select(`
          id,
          activity_type,
          description,
          created_at,
          matter:litigation_matters!matter_id(case_number)
        `)
        .eq('staff_id', staff.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (litigationActivities) {
        litigationActivities.forEach((activity: any) => {
          const caseNum = activity.matter?.case_number || 'Unknown Case';
          activities.push({
            id: `litigation-${activity.id}`,
            type: 'status_change',
            message: `${activity.activity_type}: ${activity.description.substring(0, 50)}${activity.description.length > 50 ? '...' : ''} (${caseNum})`,
            timestamp: activity.created_at,
            entityType: 'litigation_matter',
          });
        });
      }
      
      // Get service status changes by this user
      const { data: statusChanges } = await supabase
        .from('service_status_history')
        .select(`
          id,
          status_dimension,
          old_value,
          new_value,
          created_at,
          client_service:client_services!client_service_id(service_number)
        `)
        .eq('changed_by', staff.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (statusChanges) {
        statusChanges.forEach((change: any) => {
          const serviceNum = change.client_service?.service_number || 'Unknown';
          activities.push({
            id: `status-${change.id}`,
            type: 'status_change',
            message: `Changed ${change.status_dimension} from "${change.old_value || 'none'}" to "${change.new_value}" on ${serviceNum}`,
            timestamp: change.created_at,
            entityType: 'client_service',
          });
        });
      }
      
      // Sort all activities by timestamp (most recent first) and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    enabled: !!staff?.id,
  });
}

// Get dashboard stats for the current user
export function useUserDashboardStats() {
  const { staff } = useAuth();
  
  return useQuery({
    queryKey: ['user_dashboard_stats', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return null;
      
      // Count pending tasks assigned to user
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress']);
      
      // Count tasks due today
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = addDays(startOfDay(today), 1).toISOString();
      
      const { count: tasksDueToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress'])
        .gte('due_date', todayStart)
        .lt('due_date', todayEnd);
      
      // Count urgent tasks
      const { count: urgentTaskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress'])
        .eq('priority', 'urgent');
      
      return {
        totalPendingTasks: taskCount || 0,
        tasksDueToday: tasksDueToday || 0,
        urgentTasks: urgentTaskCount || 0,
      };
    },
    enabled: !!staff?.id,
  });
}
