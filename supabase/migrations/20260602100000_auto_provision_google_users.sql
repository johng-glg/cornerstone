-- Auto-provision first-time Google sign-ins.
--
-- Decision (johng-glg): any new @guardianlit.com auth user becomes Guardian Litigation Group
-- staff with the client_services_rep role on first sign-in. Admins can change role/department
-- afterward (Roles page / Staff).
--
-- Safety:
--  * The whole body is wrapped so a provisioning failure NEVER blocks authentication
--    (a raised exception in this AFTER-INSERT trigger would otherwise roll back the sign-up).
--  * Only @guardianlit.com emails are provisioned — seed/other-domain users are skipped.
--  * Users created via the invite-staff edge function carry raw_user_meta_data.invited = true
--    and are skipped here (that function assigns the admin-chosen department + role instead).
--  * Idempotent: ON CONFLICT guards so re-runs / races never duplicate.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guardian uuid := '0a000000-0000-4000-8000-000000000001';
  _full text;
  _first text;
  _last text;
BEGIN
  -- Admin-invited users are provisioned by the invite-staff function; skip them here.
  IF (NEW.raw_user_meta_data ->> 'invited') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Only auto-provision firm-domain users, and only if the Guardian tenant exists.
  IF coalesce(NEW.email, '') NOT ILIKE '%@guardianlit.com' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = _guardian) THEN
    RETURN NEW;
  END IF;

  _full := coalesce(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  _first := coalesce(nullif(split_part(_full, ' ', 1), ''), split_part(NEW.email, '@', 1));
  _last := nullif(trim(substring(_full FROM position(' ' IN _full))), '');

  INSERT INTO public.staff (user_id, company_id, first_name, last_name, email, department, is_active)
  VALUES (NEW.id, _guardian, _first, coalesce(_last, ''), NEW.email,
          'client_services'::public.department, true)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client_services_rep'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: provisioning failed for % — %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Rollback:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
