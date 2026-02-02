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
        const typedReminder = reminder as unknown as PendingReminder;
        
        // Get entity details for notification message
        const { title, message, link } = await buildNotificationContent(
          supabase, 
          typedReminder
        );

        // Get staff user_id
        const { data: staff } = await supabase
          .from('staff')
          .select('user_id')
          .eq('id', typedReminder.staff_id)
          .single();

        if (!staff?.user_id) {
          throw new Error('Staff user not found');
        }

        // Check user's notification preferences
        const notificationType = typedReminder.reminder_type === 'hearing' 
          ? 'hearing_reminder' 
          : 'response_deadline_reminder';
          
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('in_app_enabled')
          .eq('user_id', staff.user_id)
          .eq('notification_type', notificationType)
          .single();

        // Skip if user has disabled this notification type
        if (preferences && !preferences.in_app_enabled) {
          await supabase
            .from('deadline_reminders')
            .update({
              status: 'skipped',
              error_message: 'User disabled this notification type',
            })
            .eq('id', typedReminder.id);
          continue;
        }

        // Create notification
        const { data: notification, error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: staff.user_id,
            type: notificationType,
            title,
            message,
            link,
            entity_type: typedReminder.reminder_type,
            entity_id: typedReminder.entity_id,
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
          .eq('id', typedReminder.id);

        sent++;
        console.log(`Sent reminder ${typedReminder.id} to staff ${typedReminder.staff_id}`);

      } catch (err) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to send reminder ${reminder.id}:`, err);
        
        await supabase
          .from('deadline_reminders')
          .update({
            status: 'failed',
            error_message: errorMessage,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// deno-lint-ignore no-explicit-any
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

    // deno-lint-ignore no-explicit-any
    const matterData = matter as any;
    const clientName = matterData?.client_service?.primary_client
      ? `${matterData.client_service.primary_client.first_name} ${matterData.client_service.primary_client.last_name}`
      : 'Unknown Client';

    return {
      title: `Response Deadline ${daysText}`,
      message: `${clientName} vs ${matterData?.opposing_party || 'Unknown'} - ${matterData?.case_number || 'Case pending'}`,
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

    // deno-lint-ignore no-explicit-any
    const hearingData = hearing as any;
    
    const clientName = hearingData?.litigation_matter?.client_service?.primary_client
      ? `${hearingData.litigation_matter.client_service.primary_client.first_name} ${hearingData.litigation_matter.client_service.primary_client.last_name}`
      : 'Unknown Client';

    const time = new Date(hearingData?.scheduled_date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const hearingType = hearingData?.hearing_type?.replace(/_/g, ' ') || 'Hearing';

    return {
      title: `Court Hearing ${daysText}`,
      message: `${hearingType} at ${time} - ${clientName}`,
      link: `/court-calendar`,
    };
  }

  return {
    title: 'Deadline Reminder',
    message: `You have a deadline ${daysText}`,
    link: null,
  };
}
