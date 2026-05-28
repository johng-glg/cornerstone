
REVOKE EXECUTE ON FUNCTION public.is_feature_enabled(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_leads(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_leads(uuid, uuid) TO authenticated, service_role;
