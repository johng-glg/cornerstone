-- Phase A6 — per-tenant processor credential decryption (Q-A4 divergence)
-- Lovable stored Forth creds as plaintext in company_processor_configs.config JSONB. We store the
-- secret api_key encrypted in api_key_encrypted (bytea, via public.encrypt_pii) and the non-secret
-- client_id in config. This SECURITY DEFINER function returns the decrypted credential bundle and
-- is callable ONLY by service_role (edge functions) — never anon/authenticated.
--
-- Forward-only. Rollback SQL inline at bottom.

CREATE OR REPLACE FUNCTION public.decrypt_processor_credentials(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  _ct bytea;
  _cfg jsonb;
  _key text;
BEGIN
  SELECT api_key_encrypted, config
    INTO _ct, _cfg
  FROM public.company_processor_configs
  WHERE company_id = _company_id AND is_active = true
  ORDER BY is_default DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF _ct IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;

  RETURN jsonb_build_object(
    'client_id', _cfg ->> 'client_id',
    'api_key', extensions.pgp_sym_decrypt(_ct, _key)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_processor_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_processor_credentials(uuid) TO service_role;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.decrypt_processor_credentials(uuid);
