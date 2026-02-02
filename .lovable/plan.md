
# Notification Center Implementation Plan

## Overview

This feature implements a comprehensive notification system with a bell icon dropdown in the TopNav, persistent storage in the database, mark-read functionality, and user-configurable notification preferences. Notifications will update in real-time using the existing Supabase realtime infrastructure.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Bell Icon Dropdown** | Replace hardcoded badge with dynamic popover showing notification list |
| **Unread Count Badge** | Real-time count of unread notifications |
| **Notification List** | Scrollable list with icons, timestamps, and links |
| **Mark as Read** | Individual and bulk "Mark All Read" functionality |
| **Notification Preferences** | Per-category toggles in Settings (in-app, email, sound) |
| **Real-time Updates** | Live notifications using existing realtime subscription pattern |
| **Notification Types** | Task assignments, mentions, deadlines, system alerts |

---

## Database Schema

### Table 1: `notifications`

Stores all user notifications with type, content, and read status.

```sql
CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_due_soon',
  'task_overdue',
  'lead_assigned',
  'matter_assigned',
  'hearing_reminder',
  'settlement_update',
  'mention',
  'system_alert'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,  -- Optional navigation path (e.g., '/tasks/abc123')
  entity_type TEXT,  -- e.g., 'task', 'lead', 'matter'
  entity_id UUID,    -- Reference to the related entity
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, is_read) 
  WHERE is_read = false;

CREATE INDEX idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert notifications for any user (via service role)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Table 2: `notification_preferences`

Stores user preferences for each notification category.

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
```

### Database Function: Create Notification

Helper function to create notifications (used by triggers or edge functions):

```sql
CREATE OR REPLACE FUNCTION create_notification(
  _user_id UUID,
  _type notification_type,
  _title TEXT,
  _message TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL,
  _entity_type TEXT DEFAULT NULL,
  _entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id UUID;
  _in_app_enabled BOOLEAN;
BEGIN
  -- Check if user has in-app notifications enabled for this type
  SELECT COALESCE(in_app_enabled, true) INTO _in_app_enabled
  FROM notification_preferences
  WHERE user_id = _user_id AND notification_type = _type;
  
  -- Default to true if no preference exists
  _in_app_enabled := COALESCE(_in_app_enabled, true);
  
  IF _in_app_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link, entity_type, entity_id)
    VALUES (_user_id, _type, _title, _message, _link, _entity_type, _entity_id)
    RETURNING id INTO _notification_id;
  END IF;
  
  RETURN _notification_id;
END;
$$;
```

---

## Notification Type Triggers

### Task Assignment Trigger

Automatically create notification when a task is assigned:

```sql
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignee_user_id UUID;
BEGIN
  -- Only notify on new assignment or reassignment
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Get the user_id from staff table
    SELECT user_id INTO _assignee_user_id
    FROM staff WHERE id = NEW.assigned_to;
    
    IF _assignee_user_id IS NOT NULL THEN
      PERFORM create_notification(
        _assignee_user_id,
        'task_assigned',
        'New Task Assigned',
        NEW.title,
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_assignment
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();
```

---

## Files to Create

### Core Components

| File | Purpose |
|------|---------|
| `src/components/notifications/NotificationCenter.tsx` | Main dropdown component for TopNav |
| `src/components/notifications/NotificationItem.tsx` | Individual notification row |
| `src/components/notifications/NotificationEmptyState.tsx` | Empty state when no notifications |
| `src/components/settings/NotificationSettingsTab.tsx` | Preferences panel in Settings |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useNotifications.ts` | Fetch, mark read, delete notifications |
| `src/hooks/useNotificationPreferences.ts` | Fetch and update preferences |
| `src/hooks/useRealtimeNotifications.ts` | Realtime subscription with sound/toast |

### Types

| File | Purpose |
|------|---------|
| `src/types/notifications.ts` | TypeScript interfaces for notifications |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/TopNav.tsx` | Replace hardcoded bell with NotificationCenter |
| `src/pages/Settings.tsx` | Add Notifications tab |
| `src/lib/docs/roadmapData.ts` | Mark feature as Completed |

---

## Component Design

### NotificationCenter Component

The main dropdown that replaces the hardcoded bell icon:

```text
+-----------------------------------+
| 🔔 Notifications           [Mark All Read]
+-----------------------------------+
| 📋 New Task Assigned              |
|    Review client documents        |
|    2 minutes ago              [•] |
+-----------------------------------+
| 👤 Lead Assigned to You           |
|    John Smith - Web Form          |
|    1 hour ago                     |
+-----------------------------------+
| ⚠️ Task Overdue                   |
|    Follow up with creditor        |
|    Yesterday                  [•] |
+-----------------------------------+
|                                   |
|     [View All Notifications]      |
+-----------------------------------+
```

### NotificationSettingsTab Component

Grid of toggles per notification type:

```text
+-----------------------------------------------+
| Notification Preferences                      |
+-----------------------------------------------+
|                     | In-App | Email | Sound  |
+---------------------+--------+-------+--------+
| Task Assignments    |   ✓    |   ○   |   ✓    |
| Task Reminders      |   ✓    |   ✓   |   ○    |
| Lead Assignments    |   ✓    |   ○   |   ✓    |
| Matter Updates      |   ✓    |   ○   |   ○    |
| System Alerts       |   ✓    |   ✓   |   ✓    |
+-----------------------------------------------+
```

---

## Implementation Details

### 1. Notification Hook

**`src/hooks/useNotifications.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications_unread_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
}
```

### 2. Realtime Notifications Hook

**`src/hooks/useRealtimeNotifications.ts`**

Extends the existing realtime pattern with toast and sound support:

```typescript
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useRealtimeSubscription({
    table: 'notifications',
    queryKey: ['notifications'],
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
    onInsert: (payload) => {
      const notification = payload.new as any;
      
      // Show toast for new notifications
      toast({
        title: notification.title,
        description: notification.message,
      });
      
      // Play sound (check preferences)
      // playNotificationSound();
    },
  });

  // Also update unread count
  useRealtimeSubscription({
    table: 'notifications',
    queryKey: ['notifications_unread_count'],
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
  });
}
```

### 3. NotificationCenter Component

**`src/components/notifications/NotificationCenter.tsx`**

```typescript
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useUnreadCount, useMarkAllAsRead } from '@/hooks/useNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { NotificationItem } from './NotificationItem';
import { NotificationEmptyState } from './NotificationEmptyState';

export function NotificationCenter() {
  const { data: notifications, isLoading } = useNotifications(20);
  const { data: unreadCount } = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();

  // Enable realtime updates
  useRealtimeNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount && unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => markAllAsRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4">Loading...</div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                />
              ))}
            </div>
          ) : (
            <NotificationEmptyState />
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

### 4. TopNav Integration

Replace the hardcoded bell button with the NotificationCenter component:

```typescript
// Before (lines 71-77)
<Button variant="ghost" size="icon" className="relative">
  <Bell className="h-5 w-5" />
  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
    3
  </span>
</Button>

// After
<NotificationCenter />
```

### 5. Settings Integration

Add a Notifications tab to the Settings page:

```typescript
<TabsList className="mb-6">
  <TabsTrigger value="profile">Profile</TabsTrigger>
  <TabsTrigger value="notifications">Notifications</TabsTrigger>
  <TabsTrigger value="appearance">Appearance</TabsTrigger>
  <TabsTrigger value="company">Company</TabsTrigger>
</TabsList>

<TabsContent value="notifications">
  <NotificationSettingsTab />
</TabsContent>
```

---

## Notification Type Icons

Map each notification type to an appropriate Lucide icon:

| Type | Icon | Color |
|------|------|-------|
| `task_assigned` | CheckSquare | blue |
| `task_due_soon` | Clock | yellow |
| `task_overdue` | AlertCircle | red |
| `lead_assigned` | UserPlus | green |
| `matter_assigned` | Gavel | purple |
| `hearing_reminder` | Calendar | orange |
| `settlement_update` | DollarSign | green |
| `mention` | AtSign | blue |
| `system_alert` | AlertTriangle | yellow |

---

## Files Summary

### Create (7 files)

| File | Purpose |
|------|---------|
| `src/components/notifications/NotificationCenter.tsx` | Main dropdown component |
| `src/components/notifications/NotificationItem.tsx` | Individual notification row |
| `src/components/notifications/NotificationEmptyState.tsx` | Empty state UI |
| `src/components/settings/NotificationSettingsTab.tsx` | Preferences panel |
| `src/hooks/useNotifications.ts` | Notification CRUD hooks |
| `src/hooks/useNotificationPreferences.ts` | Preferences hooks |
| `src/hooks/useRealtimeNotifications.ts` | Realtime subscription |

### Modify (3 files)

| File | Changes |
|------|---------|
| `src/components/layout/TopNav.tsx` | Replace hardcoded bell with NotificationCenter |
| `src/pages/Settings.tsx` | Add Notifications tab |
| `src/lib/docs/roadmapData.ts` | Mark feature as Completed |

### Database Migration (1)

- Create `notification_type` enum
- Create `notifications` table with RLS
- Create `notification_preferences` table with RLS
- Create `create_notification` function
- Create `notify_task_assignment` trigger
- Enable realtime for `notifications` table

---

## User Experience Flow

### Receiving a Notification

1. User A assigns a task to User B
2. Database trigger fires `notify_task_assignment()`
3. New row inserted into `notifications` table
4. Supabase Realtime broadcasts the insert
5. User B's browser receives the event via `useRealtimeNotifications`
6. Query cache invalidates, UI updates with new unread count
7. Toast notification appears (optional sound plays)

### Reading Notifications

1. User clicks bell icon
2. Popover opens showing notification list
3. User clicks a notification item
4. `useMarkAsRead` mutation fires
5. Notification navigates to linked page (if `link` is set)
6. Unread count decrements

### Managing Preferences

1. User navigates to Settings > Notifications
2. Preference grid shows toggles per notification type
3. User toggles "Email" for "Task Reminders"
4. `useUpdatePreference` mutation fires
5. Future notifications respect the new setting

---

## Future Enhancements

After initial implementation:

1. **Email Integration**: Connect to Resend/SendGrid for email notifications
2. **Push Notifications**: Browser push API for desktop notifications
3. **Notification History Page**: Full-page view with filters and search
4. **Digest Mode**: Daily/weekly email summaries instead of individual emails
5. **Quiet Hours**: Time-based muting of notifications
6. **Notification Batching**: Group similar notifications (e.g., "5 new tasks assigned")
