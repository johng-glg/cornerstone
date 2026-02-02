
# Realtime Updates Implementation Plan

## Overview

This plan implements Supabase Realtime channels to provide live data updates across the application. When one user makes a change (creates a task, logs an activity, updates a status), other users viewing the same data will see the update immediately without refreshing.

---

## Priority Tables for Realtime

Based on the codebase analysis, these tables will benefit most from realtime updates:

| Table | Use Case | Benefit |
|-------|----------|---------|
| `tasks` | Kanban boards, dashboard widgets | Team sees task status changes instantly |
| `lead_activities` | Lead activity timelines | Sales reps see colleague's activities in real-time |
| `client_communications` | Client communication logs | No duplicate calls/emails when team is on same client |
| `litigation_activities` | Matter activity timelines | Legal team stays synchronized |
| `service_status_history` | Status change feeds | Managers see status updates as they happen |
| `leads` | Lead Kanban board | Pipeline updates visible to whole team |

---

## Architecture

### Supabase Realtime Flow

```text
+------------------+     postgres_changes    +------------------+
|   User A         |------------------------→|   Supabase       |
|   (Makes change) |                         |   Realtime       |
+------------------+                         +------------------+
                                                     |
                                                     | broadcast
                                                     ↓
                                            +------------------+
                                            |   All Subscribers|
                                            |   (User B, C...) |
                                            +------------------+
                                                     |
                                                     | invalidateQueries
                                                     ↓
                                            +------------------+
                                            |   React Query    |
                                            |   refetch        |
                                            +------------------+
```

### Implementation Strategy

We will create a **custom hook pattern** that:
1. Subscribes to Supabase Realtime channels
2. Listens for INSERT, UPDATE, DELETE events
3. Invalidates React Query cache to trigger refetch
4. Cleans up subscriptions on unmount

This approach:
- Leverages existing React Query caching
- Avoids complex state synchronization
- Ensures data consistency
- Minimizes code changes to existing hooks

---

## Database Changes

### Enable Realtime Publication

A single migration to add tables to the `supabase_realtime` publication:

```sql
-- Enable realtime for high-value collaborative tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_communications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.litigation_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
```

No schema changes required - just publication configuration.

---

## Files to Create

### Core Realtime Infrastructure

| File | Purpose |
|------|---------|
| `src/hooks/useRealtimeSubscription.ts` | Generic hook for subscribing to table changes |
| `src/hooks/useRealtimeTasks.ts` | Task-specific realtime hook |
| `src/hooks/useRealtimeLeads.ts` | Lead-specific realtime hook |
| `src/lib/realtime.ts` | Utility functions and channel management |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Tasks.tsx` | Add realtime subscription |
| `src/components/tasks/TaskKanban.tsx` | Handle realtime task updates |
| `src/pages/Leads.tsx` | Add realtime subscription for lead changes |
| `src/components/leads/LeadKanban.tsx` | Handle realtime lead updates |
| `src/hooks/useLeadActivities.ts` | Add realtime option for activity feed |
| `src/hooks/useClientCommunications.ts` | Add realtime option for comms timeline |
| `src/hooks/useLitigationActivities.ts` | Add realtime option for matter activities |
| `src/components/dashboards/RecentActivityFeed.tsx` | Optional realtime refresh |
| `src/hooks/useUserDashboard.ts` | Add realtime for dashboard stats |
| `src/lib/docs/roadmapData.ts` | Mark feature as Completed |

---

## Implementation Details

### 1. Generic Realtime Subscription Hook

**`src/hooks/useRealtimeSubscription.ts`**

A reusable hook that subscribes to any table and invalidates React Query:

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  queryKey: string[];
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  enabled?: boolean;
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

export function useRealtimeSubscription({
  table,
  schema = 'public',
  queryKey,
  filter,
  event = '*',
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${queryKey.join('-')}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        },
        (payload) => {
          // Invalidate the query to trigger refetch
          queryClient.invalidateQueries({ queryKey });
          
          // Call specific handlers if provided
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, JSON.stringify(queryKey), filter, event, enabled]);
}
```

### 2. Task Realtime Hook

**`src/hooks/useRealtimeTasks.ts`**

Specialized hook for task updates with toast notifications:

```typescript
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface UseRealtimeTasksOptions {
  enabled?: boolean;
  showToasts?: boolean;
}

export function useRealtimeTasks({ 
  enabled = true, 
  showToasts = true 
}: UseRealtimeTasksOptions = {}) {
  const { toast } = useToast();
  const { staff } = useAuth();

  useRealtimeSubscription({
    table: 'tasks',
    queryKey: ['tasks'],
    enabled,
    onInsert: (payload) => {
      if (showToasts && payload.new.assigned_to === staff?.id) {
        toast({
          title: 'New Task Assigned',
          description: payload.new.title,
        });
      }
    },
    onUpdate: (payload) => {
      // Optional: toast for status changes on your tasks
      if (showToasts && payload.new.assigned_to === staff?.id) {
        if (payload.old.status !== payload.new.status) {
          // Task status changed - React Query will refetch
        }
      }
    },
  });
}
```

### 3. Integration with Tasks Page

**Modification to `src/pages/Tasks.tsx`**

Add a single hook call to enable realtime:

```typescript
// Add import
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

// Inside TasksPage component
export default function TasksPage() {
  // ... existing state ...
  
  // Enable realtime updates
  useRealtimeTasks({ enabled: true, showToasts: true });
  
  // ... rest of component ...
}
```

### 4. Lead Activities with Realtime

**Modification to `src/hooks/useLeadActivities.ts`**

Add optional realtime parameter:

```typescript
export function useLeadActivities(leadId: string | undefined, options?: { realtime?: boolean }) {
  const queryKey = ['lead-activities', leadId];
  
  // Subscribe to realtime updates for this lead's activities
  useRealtimeSubscription({
    table: 'lead_activities',
    queryKey,
    filter: leadId ? `lead_id=eq.${leadId}` : undefined,
    enabled: options?.realtime && !!leadId,
  });

  return useQuery({
    queryKey,
    // ... existing query function ...
  });
}
```

### 5. Dashboard Realtime Updates

**Modification to `src/hooks/useUserDashboard.ts`**

Add realtime for urgent tasks and activity feed:

```typescript
export function useUserUrgentTasks() {
  const { staff } = useAuth();
  const queryKey = ['user_urgent_tasks', staff?.id];
  
  // Real-time updates for tasks assigned to this user
  useRealtimeSubscription({
    table: 'tasks',
    queryKey,
    filter: staff?.id ? `assigned_to=eq.${staff.id}` : undefined,
    enabled: !!staff?.id,
  });

  return useQuery({
    queryKey,
    // ... existing query function ...
  });
}
```

---

## Optional: Visual Feedback for Updates

When data updates in realtime, we can add subtle visual feedback:

### Flash Animation for Updated Rows

```css
/* Add to index.css */
@keyframes realtime-flash {
  0% { background-color: hsl(var(--primary) / 0.1); }
  100% { background-color: transparent; }
}

.realtime-updated {
  animation: realtime-flash 1s ease-out;
}
```

This would require tracking which items were updated via realtime vs. initial load.

---

## Considerations

### Performance

- **Filtered subscriptions**: Use `filter` parameter to subscribe only to relevant rows (e.g., tasks assigned to current user)
- **Selective invalidation**: Only invalidate the specific queryKey that changed
- **Debouncing**: For rapid changes, React Query's default behavior handles this well

### Connection Management

- Supabase handles reconnection automatically
- Channels are cleaned up on component unmount via useEffect cleanup
- Multiple subscriptions to the same table are handled efficiently

### Security

- Realtime respects RLS policies
- Users only receive updates for rows they have SELECT permission on
- No additional security configuration needed

---

## Testing Scenarios

1. **Task Kanban Sync**
   - Open Tasks page in two browser tabs
   - Drag a task to a new column in Tab A
   - Verify Tab B updates within 1-2 seconds

2. **Activity Feed Updates**
   - Open a Lead detail sheet in two tabs
   - Log an activity in Tab A
   - Verify the activity appears in Tab B's timeline

3. **Dashboard Stats**
   - Open Dashboard in two tabs
   - Create a new urgent task assigned to current user
   - Verify dashboard urgent task count updates

4. **Toast Notifications**
   - Have User A assign a task to User B
   - Verify User B receives a toast notification

---

## Migration SQL

```sql
-- Enable realtime for collaborative tables
-- Note: This only enables change detection, not broadcasting all data

-- Tasks: Kanban boards, assignments, status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Lead Activities: Activity timelines on lead sheets
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;

-- Client Communications: Prevent duplicate outreach
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_communications;

-- Litigation Activities: Keep legal team in sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.litigation_activities;

-- Service Status History: Status change feeds
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_status_history;

-- Leads: Lead pipeline/kanban updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
```

---

## Files Summary

### Create (3 files)

| File | Purpose |
|------|---------|
| `src/hooks/useRealtimeSubscription.ts` | Generic realtime subscription hook |
| `src/hooks/useRealtimeTasks.ts` | Task-specific realtime with toasts |
| `src/lib/realtime.ts` | Channel utilities and constants |

### Modify (9 files)

| File | Changes |
|------|---------|
| `src/pages/Tasks.tsx` | Add useRealtimeTasks hook |
| `src/pages/Leads.tsx` | Add realtime subscription |
| `src/hooks/useLeadActivities.ts` | Add realtime option |
| `src/hooks/useClientCommunications.ts` | Add realtime option |
| `src/hooks/useLitigationActivities.ts` | Add realtime option |
| `src/hooks/useUserDashboard.ts` | Add realtime for dashboard |
| `src/components/leads/LeadKanban.tsx` | Handle realtime updates |
| `src/index.css` | Optional flash animation |
| `src/lib/docs/roadmapData.ts` | Mark as Completed |

---

## User Experience

### What Users Will See

1. **Tasks Page**: Drag a task in one tab, see it move in another
2. **Lead Detail**: Activity logged by a colleague appears immediately
3. **Dashboard**: Task counts and activity feed update live
4. **Toast Notifications**: Get notified when tasks are assigned to you

### No User Action Required

- Realtime is enabled by default on supported pages
- No settings or toggles needed
- Works automatically in the background

---

## Future Enhancements

After this implementation, realtime can be extended to:

1. **Notification Center** (when implemented): Live notification updates
2. **Presence Indicators**: Show which users are viewing the same record
3. **Collaborative Editing Indicators**: Show when another user is editing
4. **Live Typing Indicators**: For chat/notes features
