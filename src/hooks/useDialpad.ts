import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InitiateCallInput {
  target_phone: string;
  related_entity_type?: 'client' | 'lead' | 'litigation_matter' | 'creditor' | 'creditor_contact' | null;
  related_entity_id?: string | null;
}

export function useInitiateCall() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: InitiateCallInput) => {
      const { data, error } = await supabase.functions.invoke('dialpad-initiate', { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: true; dialpad_call_id: string };
    },
    onSuccess: () => {
      toast({ title: 'Calling…', description: 'Your Dialpad device will ring momentarily.' });
    },
    onError: (e) => {
      toast({ title: 'Call failed', description: (e as Error).message, variant: 'destructive' });
    },
  });
}
