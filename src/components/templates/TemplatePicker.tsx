import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { useTemplates } from '@/hooks/useTemplates';
import { useRenderTemplate } from '@/hooks/useRenderTemplate';
import type { TemplateType } from '@/types/templates';
import { useToast } from '@/hooks/use-toast';

interface Props {
  type?: TemplateType;
  entityType: string;
  entityId: string;
  channel?: string;
  buttonLabel?: string;
  onApply: (result: { subject: string | null; content: string; templateId: string }) => void;
}

export function TemplatePicker({ type, entityType, entityId, channel, buttonLabel = 'Use Template', onApply }: Props) {
  const [open, setOpen] = useState(false);
  const { data: templates, isLoading } = useTemplates({ type, isActive: true });
  const render = useRenderTemplate();
  const { toast } = useToast();

  const handleSelect = async (templateId: string) => {
    setOpen(false);
    try {
      const result = await render.mutateAsync({
        template_id: templateId,
        entity_type: entityType,
        entity_id: entityId,
        additional_data: {},
        // @ts-expect-error channel passed through to edge function
        channel,
      });
      onApply({ subject: result.subject, content: result.content, templateId });
      if (result.missing_fields?.length) {
        toast({
          title: 'Template applied',
          description: `${result.missing_fields.length} merge field(s) had no data and were left blank.`,
        });
      }
    } catch {
      // useRenderTemplate shows its own toast
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={!entityId || render.isPending}>
          <Sparkles className="h-3 w-3 mr-2" />
          {render.isPending ? 'Rendering...' : buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search templates..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading...' : 'No templates found'}
            </CommandEmpty>
            <CommandGroup>
              {templates?.map((t) => (
                <CommandItem key={t.id} value={t.name} onSelect={() => handleSelect(t.id)}>
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
