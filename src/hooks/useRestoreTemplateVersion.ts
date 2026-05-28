import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export function useRestoreTemplateVersion() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, versionId }: { templateId: string; versionId: string }) => {
      const { data: version, error: vErr } = await supabase
        .from('template_versions')
        .select('content, content_html, subject, version_number')
        .eq('id', versionId)
        .single();
      if (vErr) throw vErr;

      const { data: current, error: cErr } = await supabase
        .from('templates')
        .select('current_version')
        .eq('id', templateId)
        .single();
      if (cErr) throw cErr;

      const newVersion = (current?.current_version || 0) + 1;

      const { error: uErr } = await supabase
        .from('templates')
        .update({
          content: version.content,
          content_html: version.content_html,
          subject: version.subject,
          current_version: newVersion,
        })
        .eq('id', templateId);
      if (uErr) throw uErr;

      await supabase.from('template_versions').insert({
        template_id: templateId,
        version_number: newVersion,
        content: version.content,
        content_html: version.content_html,
        subject: version.subject,
        created_by: staff?.id,
        change_notes: `Restored from v${version.version_number}`,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', vars.templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-versions', vars.templateId] });
      toast({ title: 'Template version restored' });
    },
    onError: (error) => {
      toast({ title: 'Failed to restore version', description: (error as Error).message, variant: 'destructive' });
    },
  });
}
