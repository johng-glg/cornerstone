import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DelayEntry { day_offset: number }
interface Policy {
  id?: string;
  company_id: string;
  name: string;
  max_attempts: number;
  delay_pattern: DelayEntry[];
  is_active: boolean;
}

export function NsfRetryPolicyTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [policy, setPolicy] = useState<Policy | null>(null);

  const { data: companyId } = useQuery({
    queryKey: ['my-company-id', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('company_id').eq('user_id', user!.id).single();
      return data?.company_id as string | undefined;
    },
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['nsf-retry-policy', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('nsf_retry_policies')
        .select('*')
        .eq('company_id', companyId!)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!companyId) return;
    if (existing) {
      setPolicy({
        id: existing.id,
        company_id: existing.company_id,
        name: existing.name,
        max_attempts: existing.max_attempts,
        delay_pattern: (existing.delay_pattern as unknown as DelayEntry[]) ?? [],
        is_active: existing.is_active,
      });
    } else {
      setPolicy({
        company_id: companyId,
        name: 'Default NSF Policy',
        max_attempts: 2,
        delay_pattern: [{ day_offset: 5 }, { day_offset: 10 }],
        is_active: true,
      });
    }
  }, [existing, companyId]);

  const save = useMutation({
    mutationFn: async () => {
      if (!policy) return;
      const payload = {
        company_id: policy.company_id,
        name: policy.name,
        max_attempts: policy.max_attempts,
        delay_pattern: policy.delay_pattern as unknown as never,
        is_active: policy.is_active,
      };
      if (policy.id) {
        const { error } = await supabase.from('nsf_retry_policies').update(payload).eq('id', policy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('nsf_retry_policies').insert(payload);
        if (error) throw error;
      }
    },

    onSuccess: () => {
      toast.success('NSF retry policy saved');
      qc.invalidateQueries({ queryKey: ['nsf-retry-policy'] });
    },
    onError: (e) => toast.error('Save failed', { description: (e as Error).message }),
  });

  if (isLoading || !policy) {
    return <Skeleton className="h-64 w-full" />;
  }

  const addStep = () => {
    const last = policy.delay_pattern[policy.delay_pattern.length - 1]?.day_offset ?? 0;
    setPolicy({ ...policy, delay_pattern: [...policy.delay_pattern, { day_offset: last + 5 }] });
  };
  const removeStep = (i: number) => {
    setPolicy({ ...policy, delay_pattern: policy.delay_pattern.filter((_, idx) => idx !== i) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>NSF Retry Policy</CardTitle>
        <CardDescription>
          When a draft fails as NSF, automatically schedule retry drafts based on this policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Active</Label>
            <p className="text-sm text-muted-foreground">Disable to stop scheduling new retries.</p>
          </div>
          <Switch
            checked={policy.is_active}
            onCheckedChange={(v) => setPolicy({ ...policy, is_active: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>Policy Name</Label>
          <Input value={policy.name} onChange={(e) => setPolicy({ ...policy, name: e.target.value })} />
        </div>

        <div className="space-y-2">
          <Label>Max Attempts</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={policy.max_attempts}
            onChange={(e) => setPolicy({ ...policy, max_attempts: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) })}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">Capped at the number of delay steps defined below.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Delay Steps (days after original draft)</Label>
            <Button type="button" size="sm" variant="outline" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" /> Add Step
            </Button>
          </div>
          <div className="space-y-2">
            {policy.delay_pattern.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">Attempt {i + 1}</span>
                <Input
                  type="number"
                  min={1}
                  value={d.day_offset}
                  onChange={(e) => {
                    const next = [...policy.delay_pattern];
                    next[i] = { day_offset: parseInt(e.target.value) || 1 };
                    setPolicy({ ...policy, delay_pattern: next });
                  }}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">days after</span>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeStep(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {policy.delay_pattern.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No retry steps configured.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
