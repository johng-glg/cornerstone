-- Fix SECURITY DEFINER on views by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS lead_source_metrics;
DROP VIEW IF EXISTS lead_rep_metrics;

-- Lead Source Metrics View with SECURITY INVOKER
CREATE VIEW lead_source_metrics 
WITH (security_invoker = true) AS
SELECT
  source,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END) as contacted_count,
  COUNT(CASE WHEN credit_auth_given = true THEN 1 END) as credit_pull_count,
  COUNT(CASE WHEN qualified_at IS NOT NULL THEN 1 END) as qualified_count,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_count,
  ROUND(COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as contact_ratio,
  ROUND(COUNT(CASE WHEN credit_auth_given = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as credit_pull_ratio,
  ROUND(COUNT(CASE WHEN qualified_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END), 0), 4) as qualification_ratio,
  ROUND(COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as conversion_ratio
FROM leads
GROUP BY source;

-- Lead Rep Metrics View with SECURITY INVOKER
CREATE VIEW lead_rep_metrics 
WITH (security_invoker = true) AS
SELECT
  l.assigned_to as staff_id,
  s.first_name,
  s.last_name,
  s.avatar_url,
  COUNT(*) as total_assigned,
  COUNT(CASE WHEN l.contacted_at IS NOT NULL THEN 1 END) as contacted_count,
  COUNT(CASE WHEN l.credit_auth_given = true THEN 1 END) as credit_pull_count,
  COUNT(CASE WHEN l.qualified_at IS NOT NULL THEN 1 END) as qualified_count,
  COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_count,
  COUNT(CASE WHEN l.status = 'lost' THEN 1 END) as lost_count,
  ROUND(COUNT(CASE WHEN l.contacted_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as contact_ratio,
  ROUND(COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 4) as conversion_ratio,
  ROUND(AVG(EXTRACT(EPOCH FROM (l.contacted_at - l.created_at)) / 3600)::numeric, 2) as avg_hours_to_contact,
  ROUND(AVG(EXTRACT(EPOCH FROM (l.converted_at - l.created_at)) / 86400)::numeric, 2) as avg_days_to_convert
FROM leads l
LEFT JOIN staff s ON l.assigned_to = s.id
WHERE l.assigned_to IS NOT NULL
GROUP BY l.assigned_to, s.first_name, s.last_name, s.avatar_url;