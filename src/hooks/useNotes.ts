import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentStaff } from '@/hooks/useStaff';

export interface Note {
  id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export function useNotes(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['notes', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('*, author:staff!notes_created_by_fkey(first_name, last_name, avatar_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!entityId,
  });
}

// Parse @[Name](uuid) mentions from content
function parseMentions(content: string): string[] {
  const regex = /@\[.+?\]\(([0-9a-f-]+)\)/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentStaff } = useCurrentStaff();

  return useMutation({
    mutationFn: async ({ entityType, entityId, content }: { entityType: string; entityId: string; content: string }) => {
      if (!currentStaff) throw new Error('Not authenticated');

      const { data: note, error } = await supabase
        .from('notes')
        .insert({ entity_type: entityType, entity_id: entityId, content, created_by: currentStaff.id })
        .select()
        .single();
      if (error) throw error;

      // Insert mentions
      const mentionIds = parseMentions(content);
      if (mentionIds.length > 0) {
        const { error: mentionError } = await supabase
          .from('note_mentions')
          .insert(mentionIds.map(staffId => ({ note_id: note.id, mentioned_staff_id: staffId })));
        if (mentionError) console.error('Failed to insert mentions:', mentionError);
      }

      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.entityType, variables.entityId] });
    },
    onError: (error) => {
      toast({ title: 'Failed to add note', description: (error as Error).message, variant: 'destructive' });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notes', result.entityType, result.entityId] });
      toast({ title: 'Note deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete note', description: (error as Error).message, variant: 'destructive' });
    },
  });
}
