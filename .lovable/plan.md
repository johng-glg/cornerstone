
# Lead Scoring System Implementation Plan

## Overview

This feature implements a flexible, configurable lead scoring system that automatically calculates scores based on lead attributes. Scoring profiles allow different criteria for various lead types (debt resolution vs litigation) and sources. Scores are calculated in real-time and displayed throughout the lead management UI to help sales reps prioritize outreach.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Scoring Profiles** | Company-configurable scoring criteria stored as JSONB |
| **Auto-Calculated Scores** | Database trigger calculates scores on lead insert/update |
| **Profile Assignment** | Default profile per source/interest type with manual override |
| **Score Display** | Visual score badge in Kanban cards, list view, and detail sheet |
| **Profile Management UI** | Admin interface to create and edit scoring profiles |
| **Score Breakdown** | Tooltip showing how score was calculated |

---

## Scoring Criteria

Default scoring factors based on lead attributes:

| Factor | Max Points | Logic |
|--------|------------|-------|
| **Estimated Debt** | 30 | $10k+ = 10, $25k+ = 20, $50k+ = 30 |
| **Number of Debts** | 15 | 3+ debts = 10, 5+ debts = 15 |
| **Has Active Lawsuit** | 20 | true = 20 (for litigation interest) |
| **Credit Auth Given** | 15 | true = 15 |
| **Email Provided** | 5 | Not null = 5 |
| **Phone Provided** | 5 | Not null = 5 |
| **Source Quality** | 10 | referral = 10, phone = 8, web_form = 6, etc. |

**Maximum Score**: 100

---

## Database Schema

### Table 1: `lead_scoring_profiles`

Stores configurable scoring criteria per company.

```sql
CREATE TABLE lead_scoring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  interest_type lead_interest NULL,  -- Optional: only apply to specific interest type
  source lead_source NULL,            -- Optional: only apply to specific source
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Only one default per company (enforced via partial unique index)
  CONSTRAINT unique_default_per_company 
    EXCLUDE USING btree (company_id WITH =) WHERE (is_default = true)
);

-- RLS
ALTER TABLE lead_scoring_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company scoring profiles"
  ON lead_scoring_profiles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage scoring profiles"
  ON lead_scoring_profiles FOR ALL
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );
```

### JSONB Criteria Structure

```typescript
interface ScoringCriteria {
  estimated_debt: {
    thresholds: Array<{ min: number; max?: number; points: number }>;
  };
  number_of_debts: {
    thresholds: Array<{ min: number; max?: number; points: number }>;
  };
  has_active_lawsuit: {
    points: number;
    only_for_interest_types?: string[];
  };
  credit_auth_given: {
    points: number;
  };
  email_provided: {
    points: number;
  };
  phone_provided: {
    points: number;
  };
  source_quality: {
    [source: string]: number;  // referral: 10, phone: 8, etc.
  };
  monthly_income: {
    thresholds: Array<{ min: number; max?: number; points: number }>;
  };
}
```

**Example criteria JSON:**
```json
{
  "estimated_debt": {
    "thresholds": [
      { "min": 10000, "max": 24999, "points": 10 },
      { "min": 25000, "max": 49999, "points": 20 },
      { "min": 50000, "points": 30 }
    ]
  },
  "number_of_debts": {
    "thresholds": [
      { "min": 3, "max": 4, "points": 10 },
      { "min": 5, "points": 15 }
    ]
  },
  "has_active_lawsuit": {
    "points": 20,
    "only_for_interest_types": ["litigation"]
  },
  "credit_auth_given": { "points": 15 },
  "email_provided": { "points": 5 },
  "phone_provided": { "points": 5 },
  "source_quality": {
    "referral": 10,
    "phone": 8,
    "web_form": 6,
    "advertisement": 4,
    "walk_in": 5,
    "other": 2
  }
}
```

### Leads Table Modifications

Add score columns to the existing leads table:

```sql
ALTER TABLE leads 
  ADD COLUMN lead_score INTEGER DEFAULT 0,
  ADD COLUMN score_breakdown JSONB,
  ADD COLUMN scoring_profile_id UUID REFERENCES lead_scoring_profiles(id) ON DELETE SET NULL,
  ADD COLUMN score_calculated_at TIMESTAMPTZ;

-- Index for sorting by score
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
```

---

## Database Function: Calculate Lead Score

A function that calculates the lead score based on the assigned or default profile:

```sql
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
    -- Check if restricted to specific interest types
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
```

### Trigger to Auto-Calculate Score

```sql
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

CREATE TRIGGER trg_calculate_lead_score
  BEFORE INSERT OR UPDATE OF 
    estimated_debt_amount, number_of_debts, has_active_lawsuit,
    credit_auth_given, email, phone, source, interest_type, scoring_profile_id
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_lead_score();
```

---

## Files to Create

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useScoringProfiles.ts` | CRUD hooks for scoring profiles |
| `src/hooks/useLeadScore.ts` | Helper hooks for score display and recalculation |

### Components

| File | Purpose |
|------|---------|
| `src/components/leads/LeadScoreBadge.tsx` | Visual score badge with color coding |
| `src/components/leads/ScoreBreakdownTooltip.tsx` | Hover tooltip showing point breakdown |
| `src/components/settings/ScoringProfilesTab.tsx` | Profile list and management in Settings |
| `src/components/settings/ScoringProfileFormDialog.tsx` | Create/edit scoring profile dialog |
| `src/components/settings/ScoringCriteriaEditor.tsx` | JSONB criteria visual editor |

### Types

| File | Purpose |
|------|---------|
| `src/types/scoring.ts` | TypeScript interfaces for scoring profiles and criteria |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useLeads.ts` | Include lead_score in queries, add sorting option |
| `src/components/leads/LeadKanban.tsx` | Add LeadScoreBadge to cards |
| `src/components/leads/LeadDetailSheet.tsx` | Add score display with breakdown |
| `src/pages/Leads.tsx` | Add score column to list view, add sort by score |
| `src/pages/Settings.tsx` | Add "Scoring Profiles" tab (admin only) |
| `src/lib/docs/roadmapData.ts` | Mark feature as Completed |

---

## Component Design

### LeadScoreBadge Component

Visual indicator with color-coded score:

```text
Score Ranges:
  0-30  = gray   (Cold)
  31-50 = yellow (Warm)
  51-70 = orange (Hot)
  71-100 = green (Very Hot)

Display:
+--------+
| 🔥 78  |  <- score with optional flame icon for high scores
+--------+
```

### ScoreBreakdownTooltip

Hover tooltip showing how points were earned:

```text
+---------------------------+
| Score Breakdown           |
+---------------------------+
| Estimated Debt    +30     |
| Number of Debts   +15     |
| Credit Auth       +15     |
| Phone Provided    +5      |
| Source (referral) +10     |
+---------------------------+
| Total             78      |
+---------------------------+
```

### ScoringProfilesTab in Settings

Admin-only tab for managing profiles:

```text
+-------------------------------------------+
| Scoring Profiles                   [+ New Profile]
+-------------------------------------------+
| Default Profile           [Default]       |
| All leads | Active                  [Edit]|
+-------------------------------------------+
| High-Value Debt Resolution               |
| Debt Resolution | referral      Active   |
|                                    [Edit]|
+-------------------------------------------+
| Litigation Fast-Track                     |
| Litigation | All sources    Active [Edit]|
+-------------------------------------------+
```

### ScoringCriteriaEditor

Visual editor for the JSONB criteria:

```text
+-------------------------------------------+
| Scoring Criteria Editor                   |
+-------------------------------------------+
| ESTIMATED DEBT                            |
|   $10,000 - $24,999:  [10] points        |
|   $25,000 - $49,999:  [20] points        |
|   $50,000+:           [30] points        |
|                        [+ Add Threshold]  |
+-------------------------------------------+
| NUMBER OF DEBTS                           |
|   3-4 debts:  [10] points                |
|   5+ debts:   [15] points                |
+-------------------------------------------+
| SOURCE QUALITY                            |
|   Referral:       [10] points            |
|   Phone:          [8] points             |
|   Web Form:       [6] points             |
|   Advertisement:  [4] points             |
|   Walk-in:        [5] points             |
|   Other:          [2] points             |
+-------------------------------------------+
| BOOLEAN CRITERIA                          |
|   Credit Auth Given:    [15] points      |
|   Has Active Lawsuit:   [20] points      |
|     □ Only for Litigation leads          |
|   Email Provided:       [5] points       |
|   Phone Provided:       [5] points       |
+-------------------------------------------+
```

---

## Implementation Details

### 1. Scoring Profiles Hook

**`src/hooks/useScoringProfiles.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ScoringProfile, ScoringCriteria } from '@/types/scoring';

export function useScoringProfiles() {
  return useQuery({
    queryKey: ['scoring_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_scoring_profiles')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as ScoringProfile[];
    },
  });
}

export function useCreateScoringProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: Omit<ScoringProfile, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lead_scoring_profiles')
        .insert([profile])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring_profiles'] });
    },
  });
}

// ... update, delete mutations
```

### 2. LeadScoreBadge Component

**`src/components/leads/LeadScoreBadge.tsx`**

```typescript
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScoreBreakdownTooltip } from './ScoreBreakdownTooltip';

interface LeadScoreBadgeProps {
  score: number;
  breakdown?: Record<string, number>;
  size?: 'sm' | 'md' | 'lg';
}

export function LeadScoreBadge({ score, breakdown, size = 'md' }: LeadScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 71) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 51) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (score >= 31) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };
  
  const badge = (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      getScoreColor(score),
      size === 'sm' && 'px-1.5 py-0.5 text-[10px]',
      size === 'md' && 'px-2 py-0.5 text-xs',
      size === 'lg' && 'px-3 py-1 text-sm',
    )}>
      {score >= 71 && <Flame className="h-3 w-3" />}
      {score}
    </div>
  );
  
  if (breakdown && Object.keys(breakdown).length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <ScoreBreakdownTooltip breakdown={breakdown} total={score} />
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return badge;
}
```

### 3. Default Scoring Profile Seeding

When first deployed, create a default profile for each company via migration:

```sql
-- Insert default scoring profile for existing companies
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
```

---

## UI Integration Points

### Kanban Card Update

Add score badge to `LeadCard` component:

```typescript
// In LeadCard component
<CardHeader className="p-3 pb-1">
  <div className="flex items-start justify-between gap-2">
    <div className="flex-1 min-w-0">
      <CardTitle className="text-sm font-medium truncate">
        {lead.first_name} {lead.last_name}
      </CardTitle>
      <p className="text-xs text-muted-foreground">{lead.lead_number}</p>
    </div>
    <div className="flex items-center gap-1">
      <LeadScoreBadge score={lead.lead_score || 0} size="sm" />
      {/* existing avatar */}
    </div>
  </div>
</CardHeader>
```

### List View Column

Add sortable Score column:

```typescript
<TableHead className="cursor-pointer" onClick={() => handleSort('lead_score')}>
  Score {sortField === 'lead_score' && <ArrowUpDown className="h-4 w-4" />}
</TableHead>

// In row
<TableCell>
  <LeadScoreBadge 
    score={lead.lead_score || 0} 
    breakdown={lead.score_breakdown as Record<string, number>} 
  />
</TableCell>
```

### Detail Sheet Enhancement

Add score card in details tab:

```typescript
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Lead Score
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-3">
      <LeadScoreBadge score={lead.lead_score || 0} size="lg" />
      <div className="text-sm text-muted-foreground">
        {lead.lead_score >= 71 && 'Very Hot - Priority lead'}
        {lead.lead_score >= 51 && lead.lead_score < 71 && 'Hot - High potential'}
        {lead.lead_score >= 31 && lead.lead_score < 51 && 'Warm - Moderate potential'}
        {lead.lead_score < 31 && 'Cold - Needs qualification'}
      </div>
    </div>
    {lead.score_breakdown && (
      <div className="mt-4 space-y-2">
        {Object.entries(lead.score_breakdown).map(([key, points]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">
              {key.replace(/_/g, ' ')}
            </span>
            <span className="font-medium">+{points}</span>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

---

## Files Summary

### Create (7 files)

| File | Purpose |
|------|---------|
| `src/types/scoring.ts` | TypeScript interfaces |
| `src/hooks/useScoringProfiles.ts` | Profile CRUD hooks |
| `src/hooks/useLeadScore.ts` | Score helper hooks |
| `src/components/leads/LeadScoreBadge.tsx` | Score badge component |
| `src/components/leads/ScoreBreakdownTooltip.tsx` | Breakdown tooltip |
| `src/components/settings/ScoringProfilesTab.tsx` | Profile management |
| `src/components/settings/ScoringProfileFormDialog.tsx` | Profile editor dialog |

### Modify (6 files)

| File | Changes |
|------|---------|
| `src/hooks/useLeads.ts` | Include score fields in queries |
| `src/components/leads/LeadKanban.tsx` | Add LeadScoreBadge to cards |
| `src/components/leads/LeadDetailSheet.tsx` | Add score section |
| `src/pages/Leads.tsx` | Add score column, sort option |
| `src/pages/Settings.tsx` | Add Scoring Profiles tab |
| `src/lib/docs/roadmapData.ts` | Mark as Completed |

### Database Migration (1)

- Create `lead_scoring_profiles` table with JSONB criteria
- Add `lead_score`, `score_breakdown`, `scoring_profile_id` to leads
- Create `calculate_lead_score` function
- Create score calculation trigger
- Seed default scoring profile for existing companies

---

## Recalculation Strategy

For existing leads, a one-time batch recalculation after migration:

```sql
-- Recalculate scores for all existing leads
UPDATE leads l
SET (lead_score, score_breakdown, score_calculated_at) = (
  SELECT score, breakdown, now()
  FROM calculate_lead_score(l)
)
WHERE lead_score IS NULL OR lead_score = 0;
```

---

## Future Enhancements

After initial implementation:

1. **Score History**: Track score changes over time
2. **Decay Factor**: Reduce scores for aging leads
3. **Engagement Scoring**: Add points for activities (calls, emails)
4. **A/B Testing**: Compare conversion rates across scoring profiles
5. **Machine Learning**: Train models on converted leads to optimize scoring
