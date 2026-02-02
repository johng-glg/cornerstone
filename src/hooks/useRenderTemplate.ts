import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MERGE_FIELD_REGISTRY, 
  getMergeFieldTag,
  MergeFieldDefinition 
} from '@/types/templates';

interface RenderRequest {
  template_id?: string;
  template_content?: string;
  template_subject?: string;
  entity_type: string;
  entity_id: string;
  additional_data?: Record<string, string>;
}

interface RenderResponse {
  content: string;
  subject: string | null;
  missing_fields: string[];
}

// Client-side preview rendering with sample data
export function renderTemplatePreview(
  content: string,
  subject?: string | null
): { content: string; subject: string | null } {
  // Generate sample data from registry
  const sampleData: Record<string, string> = {};
  
  Object.values(MERGE_FIELD_REGISTRY).flat().forEach((field: MergeFieldDefinition) => {
    const tag = getMergeFieldTag(field);
    sampleData[tag] = field.sampleValue || `[${field.label}]`;
  });
  
  // Replace merge fields with sample values
  let renderedContent = content;
  let renderedSubject = subject || null;
  
  Object.entries(sampleData).forEach(([tag, value]) => {
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTag, 'g');
    renderedContent = renderedContent.replace(regex, value);
    if (renderedSubject) {
      renderedSubject = renderedSubject.replace(regex, value);
    }
  });
  
  return { content: renderedContent, subject: renderedSubject };
}

// Server-side rendering with real entity data
export function useRenderTemplate() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (request: RenderRequest): Promise<RenderResponse> => {
      const { data, error } = await supabase.functions.invoke('render-template', {
        body: request,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data as RenderResponse;
    },
    onError: (error) => {
      toast({
        title: 'Failed to render template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Extract merge fields used in content
export function extractUsedMergeFields(content: string): string[] {
  const regex = /\{[a-z_.]+\}/g;
  const matches = content.match(regex) || [];
  return [...new Set(matches)];
}

// Validate that all merge fields in content are valid
export function validateMergeFields(content: string): { valid: boolean; invalid: string[] } {
  const usedFields = extractUsedMergeFields(content);
  const validTags = new Set(
    Object.values(MERGE_FIELD_REGISTRY)
      .flat()
      .map(f => getMergeFieldTag(f))
  );
  
  const invalid = usedFields.filter(tag => !validTags.has(tag));
  
  return {
    valid: invalid.length === 0,
    invalid,
  };
}
