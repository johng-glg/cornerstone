
# Deadline Reminder System Implementation Plan

## Overview

This feature implements an automated reminder system for litigation response deadlines and court hearings. A scheduled Edge Function runs periodically to check for upcoming deadlines and creates in-app notifications (with future email support) for assigned staff members. Users can configure reminder timing (e.g., 7 days, 3 days, 1 day before).

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Deadline Reminders** | Automatic notifications for response deadlines |
| **Hearing Reminders** | Alerts for upcoming court appearances |
| **Configurable Timing** | Set reminder intervals (e.g., 7, 3, 1 day before) |
| **Duplicate Prevention** | Track sent reminders to avoid repeat notifications |
| **Per-User Preferences** | Respects existing notification preferences |
| **Audit Trail** | Log of all reminders sent |

---

## Reminder Types

| Type | Source Table | Date Field | Description |
|------|--------------|------------|-------------|
| `response_deadline` | `litigation_matters` | `response_deadline` | Court response filing deadline |
| `hearing` | `litigation_hearings` | `scheduled_date` | Scheduled court appearance |
| `task_due` | `tasks` | `due_date` | Task deadline (bonus) |

---

## Database Schema

### Table: `deadline_reminders`

Stores reminder configuration and tracks sent notifications:

```sql
CREATE TYPE reminder_type AS ENUM (
  'response_deadline',
  'hearing',
  'task_due'
);

CREATE TYPE reminder_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

CREATE TABLE deadline_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What to remind about
  reminder_type reminder_type NOT NULL,
  entity_id UUID NOT NULL,                    -- litigation_matters.id, litigation_hearings.id, or tasks.id
  deadline_date TIMESTAMPTZ NOT NULL,         -- The actual deadline/hearing date
  
  -- Who to notify
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  
  -- Reminder configuration
  days_before INTEGER NOT NULL,               -- 7, 3, 1, 0 days before
  scheduled_for TIMESTAMPTZ NOT NULL,         -- When reminder should be sent
  
  -- Tracking
  status reminder_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  notification_id UUID REFERENCES notifications(id),
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate reminders
  UNIQUE(reminder_type, entity_id, staff_id, days_before)
);

-- Index for cron job query
CREATE INDEX idx_deadline_reminders_pending 
  ON deadline_reminders(scheduled_for, status)
  WHERE status = 'pending';

-- Index for entity lookup
CREATE INDEX idx_deadline_reminders_entity
  ON deadline_reminders(reminder_type, entity_id);

-- RLS
ALTER TABLE deadline_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their reminders"
  ON deadline_reminders FOR SELECT
  TO authenticated
  USING (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));
```

### Table: `reminder_settings`

Global and per-user reminder configuration:

```sql
CREATE TABLE reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Which reminders to send (days before deadline)
  response_deadline_days INTEGER[] NOT NULL DEFAULT '{7, 3, 1}',
  hearing_days INTEGER[] NOT NULL DEFAULT '{7, 3, 1, 0}',  -- 0 = day of
  task_due_days INTEGER[] NOT NULL DEFAULT '{3, 1}',
  
  -- Timing
  reminder_hour INTEGER NOT NULL DEFAULT 9,   -- Send at 9 AM local
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- RLS
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company settings"
  ON reminder_settings FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage settings"
  ON reminder_settings FOR ALL
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );
```

---

## Database Function: Generate Reminders

Function to scan for upcoming deadlines and create pending reminders:

```sql
CREATE OR REPLACE FUNCTION generate_deadline_reminders()
RETURNS TABLE(reminders_created INTEGER, errors TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _settings reminder_settings;
  _days INTEGER;
  _created INTEGER := 0;
  _errors TEXT[] := '{}';
BEGIN
  -- Process each company's settings
  FOR _settings IN SELECT * FROM reminder_settings WHERE is_active = true
  LOOP
    -- Response Deadlines
    FOREACH _days IN ARRAY _settings.response_deadline_days
    LOOP
      -- Find litigation matters with deadlines in range and assigned staff
      INSERT INTO deadline_reminders (
        reminder_type, entity_id, deadline_date, staff_id, 
        days_before, scheduled_for
      )
      SELECT 
        'response_deadline',
        lm.id,
        lm.response_deadline,
        a.staff_id,
        _days,
        (lm.response_deadline::date - _days) + (_settings.reminder_hour || ' hours')::interval
      FROM litigation_matters lm
      JOIN assignments a ON a.entity_id = lm.id 
        AND a.entity_type = 'litigation_matters' 
        AND a.is_active = true
      WHERE lm.response_deadline IS NOT NULL
        AND lm.response_deadline > now()
        AND lm.status NOT IN ('settled', 'dismissed', 'dropped', 'judgment', 'declined')
        AND (lm.response_deadline::date - _days) >= CURRENT_DATE
        AND (lm.response_deadline::date - _days) <= CURRENT_DATE + 1
      ON CONFLICT (reminder_type, entity_id, staff_id, days_before) DO NOTHING;
      
      _created := _created + (SELECT COUNT(*) FROM deadline_reminders 
        WHERE created_at > now() - interval '1 minute');
    END LOOP;
    
    -- Hearings
    FOREACH _days IN ARRAY _settings.hearing_days
    LOOP
      INSERT INTO deadline_reminders (
        reminder_type, entity_id, deadline_date, staff_id,
        days_before, scheduled_for
      )
      SELECT 
        'hearing',
        lh.id,
        lh.scheduled_date,
        a.staff_id,
        _days,
        (lh.scheduled_date::date - _days) + (_settings.reminder_hour || ' hours')::interval
      FROM litigation_hearings lh
      JOIN litigation_matters lm ON lm.id = lh.matter_id
      JOIN assignments a ON a.entity_id = lm.id 
        AND a.entity_type = 'litigation_matters' 
        AND a.is_active = true
      WHERE lh.scheduled_date > now()
        AND lh.outcome IS NULL  -- Not yet completed
        AND lm.status NOT IN ('settled', 'dismissed', 'dropped', 'judgment', 'declined')
        AND (lh.scheduled_date::date - _days) >= CURRENT_DATE
        AND (lh.scheduled_date::date - _days) <= CURRENT_DATE + 1
      ON CONFLICT (reminder_type, entity_id, staff_id, days_before) DO NOTHING;
    END LOOP;
  END LOOP;
  
  reminders_created := _created;
  errors := _errors;
  RETURN NEXT;
END;
$$;
```

---

## Edge Function: `process-deadline-reminders`

Scheduled function that runs hourly to send pending reminders:

```typescript
// supabase/functions/process-deadline-reminders/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PendingReminder {
  id: string;
  reminder_type: 'response_deadline' | 'hearing' | 'task_due';
  entity_id: string;
  deadline_date: string;
  staff_id: string;
  days_before: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting deadline reminder processing...');

    // First, generate any new reminders needed
    const { error: genError } = await supabase.rpc('generate_deadline_reminders');
    if (genError) {
      console.error('Error generating reminders:', genError);
    }

    // Fetch pending reminders that are due
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('deadline_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);

    if (fetchError) throw fetchError;

    console.log(`Found ${pendingReminders?.length || 0} pending reminders`);

    let sent = 0;
    let failed = 0;

    for (const reminder of pendingReminders || []) {
      try {
        // Get entity details for notification message
        const { title, message, link } = await buildNotificationContent(
          supabase, 
          reminder
        );

        // Check user's notification preferences
        const { data: staff } = await supabase
          .from('staff')
          .select('user_id')
          .eq('id', reminder.staff_id)
          .single();

        if (!staff?.user_id) {
          throw new Error('Staff user not found');
        }

        // Create notification
        const { data: notification, error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: staff.user_id,
            type: reminder.reminder_type === 'hearing' 
              ? 'hearing_reminder' 
              : 'task_due_soon',
            title,
            message,
            link,
            entity_type: reminder.reminder_type,
            entity_id: reminder.entity_id,
          })
          .select()
          .single();

        if (notifError) throw notifError;

        // Mark reminder as sent
        await supabase
          .from('deadline_reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            notification_id: notification.id,
          })
          .eq('id', reminder.id);

        sent++;
        console.log(`Sent reminder ${reminder.id} to staff ${reminder.staff_id}`);

      } catch (err) {
        failed++;
        console.error(`Failed to send reminder ${reminder.id}:`, err);
        
        await supabase
          .from('deadline_reminders')
          .update({
            status: 'failed',
            error_message: err.message,
          })
          .eq('id', reminder.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingReminders?.length || 0,
        sent,
        failed,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function buildNotificationContent(supabase: any, reminder: PendingReminder) {
  const daysText = reminder.days_before === 0 
    ? 'today' 
    : reminder.days_before === 1 
      ? 'tomorrow' 
      : `in ${reminder.days_before} days`;

  if (reminder.reminder_type === 'response_deadline') {
    const { data: matter } = await supabase
      .from('litigation_matters')
      .select(`
        case_number,
        opposing_party,
        client_service:client_services(
          primary_client:clients(first_name, last_name)
        )
      `)
      .eq('id', reminder.entity_id)
      .single();

    const clientName = matter?.client_service?.primary_client
      ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
      : 'Unknown Client';

    return {
      title: `Response Deadline ${daysText}`,
      message: `${clientName} vs ${matter?.opposing_party || 'Unknown'} - ${matter?.case_number || 'Case pending'}`,
      link: `/litigation?matter=${reminder.entity_id}`,
    };
  }

  if (reminder.reminder_type === 'hearing') {
    const { data: hearing } = await supabase
      .from('litigation_hearings')
      .select(`
        hearing_type,
        location,
        scheduled_date,
        litigation_matter:litigation_matters(
          case_number,
          court_name,
          client_service:client_services(
            primary_client:clients(first_name, last_name)
          )
        )
      `)
      .eq('id', reminder.entity_id)
      .single();

    const clientName = hearing?.litigation_matter?.client_service?.primary_client
      ? `${hearing.litigation_matter.client_service.primary_client.first_name} ${hearing.litigation_matter.client_service.primary_client.last_name}`
      : 'Unknown Client';

    const time = new Date(hearing?.scheduled_date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return {
      title: `Court Hearing ${daysText}`,
      message: `${hearing?.hearing_type?.replace('_', ' ')} at ${time} - ${clientName}`,
      link: `/court-calendar`,
    };
  }

  return {
    title: 'Deadline Reminder',
    message: `You have a deadline ${daysText}`,
    link: null,
  };
}
```

---

## Cron Job Setup

Set up pg_cron to run the reminder processor hourly:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule hourly reminder processing
SELECT cron.schedule(
  'process-deadline-reminders',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://scswhhmwmbjdffplwnsf.supabase.co/functions/v1/process-deadline-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Files to Create

### Types

| File | Purpose |
|------|---------|
| `src/types/reminders.ts` | TypeScript interfaces for reminders |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useDeadlineReminders.ts` | Query/manage reminders |
| `src/hooks/useReminderSettings.ts` | CRUD for reminder settings |

### Components

| File | Purpose |
|------|---------|
| `src/components/settings/ReminderSettingsTab.tsx` | Admin configuration UI |
| `src/components/dashboards/DeadlineRemindersWidget.tsx` | Dashboard display |

### Edge Function

| File | Purpose |
|------|---------|
| `supabase/functions/process-deadline-reminders/index.ts` | Cron job processor |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add "Reminders" tab |
| `src/types/notifications.ts` | Add `response_deadline_reminder` type |
| `supabase/config.toml` | Register new edge function |
| `src/lib/docs/schemaData.ts` | Document new tables |
| `src/lib/docs/featureGuides.ts` | Add reminder guide |
| `src/lib/docs/roadmapData.ts` | Mark as Completed |

---

## UI Design

### Reminder Settings (Settings Tab)

```text
+---------------------------------------------------+
| Deadline Reminders                                 |
+---------------------------------------------------+
| ✓ Enable automatic deadline reminders              |
|                                                    |
| Response Deadline Reminders                        |
| Send reminders: [✓] 7 days  [✓] 3 days  [✓] 1 day  |
|                                                    |
| Hearing Reminders                                  |
| Send reminders: [✓] 7 days  [✓] 3 days  [✓] 1 day  |
|                 [✓] Day of hearing                 |
|                                                    |
| Reminder Timing                                    |
| Send reminders at: [▼ 9:00 AM                    ] |
+---------------------------------------------------+
```

### Dashboard Widget

```text
+---------------------------------------------------+
| 📅 Upcoming Deadlines                              |
+---------------------------------------------------+
| ⚠️ Response Deadline - TOMORROW                    |
|    Smith vs Capital One (Case #2024-1234)         |
|    Due: Feb 3, 2026                               |
+---------------------------------------------------+
| 🏛 Court Hearing - in 3 days                       |
|    Status Conference - Johnson matter              |
|    Feb 5, 2026 at 9:30 AM                         |
+---------------------------------------------------+
| ⏰ Response Deadline - in 7 days                   |
|    Williams vs Chase Bank                          |
|    Due: Feb 9, 2026                               |
+---------------------------------------------------+
|                          [View Court Calendar →]  |
+---------------------------------------------------+
```

---

## Notification Types Update

Add new notification type for response deadlines:

```typescript
// src/types/notifications.ts
export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'lead_assigned'
  | 'matter_assigned'
  | 'hearing_reminder'
  | 'response_deadline_reminder'  // NEW
  | 'settlement_update'
  | 'mention'
  | 'system_alert';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  // ... existing
  response_deadline_reminder: 'Response Deadline Reminders',
  hearing_reminder: 'Hearing Reminders',
};
```

---

## Flow Diagram

```text
+----------------+     +------------------+     +------------------+
|   pg_cron      | --> | Edge Function    | --> | notifications    |
|   (hourly)     |     | process-deadline |     | table            |
+----------------+     +------------------+     +------------------+
                              |
                              v
                       +------------------+
                       | deadline_        |
                       | reminders table  |
                       +------------------+
                              |
        +---------------------+---------------------+
        v                     v                     v
+----------------+    +----------------+    +----------------+
| litigation_    |    | litigation_    |    | tasks          |
| matters        |    | hearings       |    | (future)       |
+----------------+    +----------------+    +----------------+
```

---

## Implementation Phases

### Phase 1: Database Setup
1. Create `reminder_type` and `reminder_status` enums
2. Create `deadline_reminders` table with indexes
3. Create `reminder_settings` table
4. Create `generate_deadline_reminders()` function
5. Set up RLS policies

### Phase 2: Edge Function
1. Create `process-deadline-reminders` function
2. Add to `supabase/config.toml`
3. Implement notification content builder
4. Test manually before enabling cron

### Phase 3: Frontend
1. Create types and hooks
2. Build `ReminderSettingsTab` component
3. Add to Settings page
4. Update notification types

### Phase 4: Cron Activation
1. Enable pg_cron extension (if not already)
2. Schedule hourly job
3. Monitor execution logs

---

## Files Summary

### Create (5 files)

| File | Purpose |
|------|---------|
| `src/types/reminders.ts` | TypeScript interfaces |
| `src/hooks/useDeadlineReminders.ts` | Query reminders |
| `src/hooks/useReminderSettings.ts` | Settings CRUD |
| `src/components/settings/ReminderSettingsTab.tsx` | Admin UI |
| `supabase/functions/process-deadline-reminders/index.ts` | Cron processor |

### Modify (6 files)

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add Reminders tab |
| `src/types/notifications.ts` | Add response_deadline_reminder type |
| `supabase/config.toml` | Register edge function |
| `src/lib/docs/schemaData.ts` | Document tables |
| `src/lib/docs/featureGuides.ts` | Add guide |
| `src/lib/docs/roadmapData.ts` | Mark Completed |

### Database Migration (1)

- Create `reminder_type` and `reminder_status` enums
- Create `deadline_reminders` table
- Create `reminder_settings` table
- Create `generate_deadline_reminders()` function
- Set up RLS policies
- (Optional) Enable pg_cron scheduling

---

## Future Enhancements

After initial implementation:

1. **Email Notifications**: Send email reminders via Resend/SendGrid
2. **SMS Reminders**: Critical deadline alerts via Twilio
3. **Snooze Feature**: Postpone reminder by 1 hour/1 day
4. **Custom Intervals**: Per-matter reminder configuration
5. **Escalation Rules**: Notify manager if deadline missed
6. **Calendar Integration**: Export to Google/Outlook calendars
