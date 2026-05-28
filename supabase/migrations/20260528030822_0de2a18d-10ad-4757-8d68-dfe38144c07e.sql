-- Phase 2A — PII encryption foundation
-- 1) Vault-stored encryption key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'pii_encryption_key',
      'Operation Cornerstone Phase 2A — symmetric key for pgp_sym_encrypt on SSN + banking ciphertext columns'
    );
  END IF;
END
$$;

-- 2) Add new PII columns on clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS ssn_last4 text,
  ADD COLUMN IF NOT EXISTS ssn_ciphertext bytea;

UPDATE public.clients
SET ssn_last4 = ssn_encrypted
WHERE ssn_encrypted IS NOT NULL
  AND ssn_encrypted ~ '^\d{4}$'
  AND ssn_last4 IS NULL;

COMMENT ON COLUMN public.clients.ssn_encrypted
  IS 'DEPRECATED Phase 2A. Use ssn_last4 (plain) and ssn_ciphertext (bytea via public.encrypt_pii). Do not write to this column for new rows.';

-- 3) Add new PII columns on lead_banking
ALTER TABLE public.lead_banking
  ADD COLUMN IF NOT EXISTS account_number_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS routing_number_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS account_number_last4 text,
  ADD COLUMN IF NOT EXISTS routing_number_last4 text;

COMMENT ON COLUMN public.lead_banking.account_number_encrypted
  IS 'DEPRECATED Phase 2A. Use account_number_ciphertext (bytea via public.encrypt_pii) + account_number_last4.';
COMMENT ON COLUMN public.lead_banking.routing_number_encrypted
  IS 'DEPRECATED Phase 2A. Use routing_number_ciphertext (bytea via public.encrypt_pii) + routing_number_last4.';

-- 4) Helper: encrypt arbitrary PII text using the vault key
CREATE OR REPLACE FUNCTION public.encrypt_pii(_plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  _key text;
BEGIN
  IF _plaintext IS NULL OR length(_plaintext) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'pii_encryption_key'
    LIMIT 1;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not configured in vault';
  END IF;
  RETURN extensions.pgp_sym_encrypt(_plaintext, _key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.encrypt_pii(text) TO authenticated, service_role;

-- 5) Helper: admin-only SSN decryption, company-scoped
CREATE OR REPLACE FUNCTION public.decrypt_client_ssn(_client_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  _key text;
  _cipher bytea;
  _company uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins may decrypt SSN';
  END IF;
  SELECT ssn_ciphertext, company_id INTO _cipher, _company
    FROM public.clients WHERE id = _client_id;
  IF _company IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT public.can_access_company(auth.uid(), _company) THEN
    RAISE EXCEPTION 'Access denied for company';
  END IF;
  IF _cipher IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
  RETURN extensions.pgp_sym_decrypt(_cipher, _key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_client_ssn(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.decrypt_client_ssn(uuid) TO authenticated, service_role;

-- 6) Helper: admin-only lead banking decryption, company-scoped
CREATE OR REPLACE FUNCTION public.decrypt_lead_banking(_lead_banking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  _key text;
  _acct bytea;
  _rout bytea;
  _company uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins may decrypt banking';
  END IF;
  SELECT lb.account_number_ciphertext, lb.routing_number_ciphertext, l.company_id
    INTO _acct, _rout, _company
    FROM public.lead_banking lb
    JOIN public.leads l ON l.id = lb.lead_id
    WHERE lb.id = _lead_banking_id;
  IF _company IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT public.can_access_company(auth.uid(), _company) THEN
    RAISE EXCEPTION 'Access denied for company';
  END IF;
  SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
  RETURN jsonb_build_object(
    'account_number', CASE WHEN _acct IS NULL THEN NULL ELSE extensions.pgp_sym_decrypt(_acct, _key) END,
    'routing_number', CASE WHEN _rout IS NULL THEN NULL ELSE extensions.pgp_sym_decrypt(_rout, _key) END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_lead_banking(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.decrypt_lead_banking(uuid) TO authenticated, service_role;