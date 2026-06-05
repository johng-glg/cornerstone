-- Allow admins to manage system_setting from the UI (the forecasting thresholds: min_balance_floor,
-- incidental_buffer_per_payment, default_fee_rate, alert_horizon_days). Reads stay open to all
-- authenticated users (existing "Authenticated can read system_setting" policy); writes are admin-only,
-- mirroring the role_permissions admin-write pattern.
CREATE POLICY "Admins can insert system_setting" ON public.system_setting
    FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update system_setting" ON public.system_setting
    FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
