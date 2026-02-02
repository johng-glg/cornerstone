-- Enable realtime for collaborative tables
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