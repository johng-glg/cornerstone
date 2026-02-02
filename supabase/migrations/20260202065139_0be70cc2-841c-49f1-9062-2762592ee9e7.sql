-- Create lead_scoring_profiles table
CREATE TABLE lead_scoring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  interest_type lead_interest NULL,
  source lead_source NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create partial unique index for one default per company
CREATE UNIQUE INDEX idx_lead_scoring_profiles_unique_default 
  ON lead_scoring_profiles(company_id) WHERE (is_default = true);

-- Indexes for querying
CREATE INDEX idx_lead_scoring_profiles_company ON lead_scoring_profiles(company_id);
CREATE INDEX idx_lead_scoring_profiles_active ON lead_scoring_profiles(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE lead_scoring_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view company scoring profiles"
  ON lead_scoring_profiles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company scoring profiles"
  ON lead_scoring_profiles FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company scoring profiles"
  ON lead_scoring_profiles FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete company scoring profiles"
  ON lead_scoring_profiles FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Add score columns to leads table
ALTER TABLE leads 
  ADD COLUMN lead_score INTEGER DEFAULT 0,
  ADD COLUMN score_breakdown JSONB,
  ADD COLUMN scoring_profile_id UUID REFERENCES lead_scoring_profiles(id) ON DELETE SET NULL,
  ADD COLUMN score_calculated_at TIMESTAMPTZ;

-- Index for sorting by score
CREATE INDEX idx_leads_score ON leads(lead_score DESC);

-- Create function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_row leads)
RETURNS TABLE(score INTEGER, breakdown JSONB)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile lead_scoring_profiles;
  _criteria JSONB;
  _total_score INTEGER := 0;
  _breakdown JSONB := '{}'::jsonb;
  _points INTEGER;
  _threshold RECORD;
BEGIN
  -- Get scoring profile (explicit assignment > source-specific > interest-specific > default)
  SELECT * INTO _profile
  FROM lead_scoring_profiles
  WHERE company_id = lead_row.company_id
    AND is_active = true
    AND (
      id = lead_row.scoring_profile_id
      OR (lead_row.scoring_profile_id IS NULL AND (
        (source = lead_row.source AND interest_type = lead_row.interest_type)
        OR (source = lead_row.source AND interest_type IS NULL)
        OR (source IS NULL AND interest_type = lead_row.interest_type)
        OR (source IS NULL AND interest_type IS NULL AND is_default = true)
      ))
    )
  ORDER BY 
    CASE WHEN id = lead_row.scoring_profile_id THEN 0 ELSE 1 END,
    CASE WHEN source IS NOT NULL AND interest_type IS NOT NULL THEN 0
         WHEN source IS NOT NULL THEN 1
         WHEN interest_type IS NOT NULL THEN 2
         ELSE 3 END
  LIMIT 1;
  
  -- If no profile found, return 0
  IF _profile IS NULL THEN
    RETURN QUERY SELECT 0, '{}'::jsonb;
    RETURN;
  END IF;
  
  _criteria := _profile.criteria;
  
  -- Estimated Debt scoring
  IF lead_row.estimated_debt_amount IS NOT NULL AND _criteria ? 'estimated_debt' THEN
    FOR _threshold IN 
      SELECT * FROM jsonb_to_recordset(_criteria->'estimated_debt'->'thresholds') 
        AS x(min numeric, max numeric, points integer)
      ORDER BY min DESC
    LOOP
      IF lead_row.estimated_debt_amount >= _threshold.min 
         AND (_threshold.max IS NULL OR lead_row.estimated_debt_amount <= _threshold.max) THEN
        _points := _threshold.points;
        _total_score := _total_score + _points;
        _breakdown := _breakdown || jsonb_build_object('estimated_debt', _points);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Number of Debts scoring
  IF lead_row.number_of_debts IS NOT NULL AND _criteria ? 'number_of_debts' THEN
    FOR _threshold IN 
      SELECT * FROM jsonb_to_recordset(_criteria->'number_of_debts'->'thresholds') 
        AS x(min integer, max integer, points integer)
      ORDER BY min DESC
    LOOP
      IF lead_row.number_of_debts >= _threshold.min 
         AND (_threshold.max IS NULL OR lead_row.number_of_debts <= _threshold.max) THEN
        _points := _threshold.points;
        _total_score := _total_score + _points;
        _breakdown := _breakdown || jsonb_build_object('number_of_debts', _points);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Has Active Lawsuit scoring
  IF lead_row.has_active_lawsuit = true AND _criteria ? 'has_active_lawsuit' THEN
    IF NOT (_criteria->'has_active_lawsuit' ? 'only_for_interest_types') 
       OR lead_row.interest_type::text = ANY(
         SELECT jsonb_array_elements_text(_criteria->'has_active_lawsuit'->'only_for_interest_types')
       ) THEN
      _points := (_criteria->'has_active_lawsuit'->>'points')::integer;
      _total_score := _total_score + _points;
      _breakdown := _breakdown || jsonb_build_object('has_active_lawsuit', _points);
    END IF;
  END IF;
  
  -- Credit Auth scoring
  IF lead_row.credit_auth_given = true AND _criteria ? 'credit_auth_given' THEN
    _points := (_criteria->'credit_auth_given'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('credit_auth_given', _points);
  END IF;
  
  -- Email provided scoring
  IF lead_row.email IS NOT NULL AND _criteria ? 'email_provided' THEN
    _points := (_criteria->'email_provided'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('email_provided', _points);
  END IF;
  
  -- Phone provided scoring
  IF lead_row.phone IS NOT NULL AND _criteria ? 'phone_provided' THEN
    _points := (_criteria->'phone_provided'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('phone_provided', _points);
  END IF;
  
  -- Source quality scoring
  IF _criteria ? 'source_quality' AND _criteria->'source_quality' ? lead_row.source::text THEN
    _points := (_criteria->'source_quality'->>lead_row.source::text)::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('source_quality', _points);
  END IF;
  
  RETURN QUERY SELECT _total_score, _breakdown;
END;
$$;

-- Create trigger function to auto-calculate score
CREATE OR REPLACE FUNCTION trigger_calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result RECORD;
BEGIN
  SELECT * INTO _result FROM calculate_lead_score(NEW);
  
  NEW.lead_score := _result.score;
  NEW.score_breakdown := _result.breakdown;
  NEW.score_calculated_at := now();
  
  RETURN NEW;
END;
$$;

-- Create trigger on leads table
CREATE TRIGGER trg_calculate_lead_score
  BEFORE INSERT OR UPDATE OF 
    estimated_debt_amount, number_of_debts, has_active_lawsuit,
    credit_auth_given, email, phone, source, interest_type, scoring_profile_id
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_lead_score();

-- Seed default scoring profile for existing companies
INSERT INTO lead_scoring_profiles (company_id, name, description, is_default, criteria)
SELECT 
  id,
  'Default Scoring Profile',
  'Standard scoring criteria for all leads',
  true,
  '{
    "estimated_debt": {
      "thresholds": [
        {"min": 10000, "max": 24999, "points": 10},
        {"min": 25000, "max": 49999, "points": 20},
        {"min": 50000, "points": 30}
      ]
    },
    "number_of_debts": {
      "thresholds": [
        {"min": 3, "max": 4, "points": 10},
        {"min": 5, "points": 15}
      ]
    },
    "has_active_lawsuit": {"points": 20, "only_for_interest_types": ["litigation"]},
    "credit_auth_given": {"points": 15},
    "email_provided": {"points": 5},
    "phone_provided": {"points": 5},
    "source_quality": {
      "referral": 10,
      "phone": 8,
      "web_form": 6,
      "advertisement": 4,
      "walk_in": 5,
      "other": 2
    }
  }'::jsonb
FROM companies
WHERE is_active = true;

-- Recalculate scores for existing leads
UPDATE leads l
SET 
  lead_score = result.score,
  score_breakdown = result.breakdown,
  score_calculated_at = now()
FROM (
  SELECT l2.id, (calculate_lead_score(l2)).score, (calculate_lead_score(l2)).breakdown
  FROM leads l2
) AS result
WHERE l.id = result.id;