import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Template, 
  templateTypeLabels, 
  MERGE_FIELD_REGISTRY,
  getMergeFieldTag,
} from '@/types/templates';
import { Mail, MessageSquare, FileText } from 'lucide-react';

interface TemplatePreviewProps {
  template: Template;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate sample data for preview
const generateSampleData = (): Record<string, string> => {
  const data: Record<string, string> = {};
  
  Object.values(MERGE_FIELD_REGISTRY).flat().forEach((field) => {
    const tag = getMergeFieldTag(field);
    data[tag] = field.sampleValue || `[${field.label}]`;
  });
  
  return data;
};

// Render template content with merge fields replaced by sample values
const renderWithSampleData = (content: string, sampleData: Record<string, string>): string => {
  let rendered = content;
  
  Object.entries(sampleData).forEach(([tag, value]) => {
    // Escape special regex characters in tag
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rendered = rendered.replace(new RegExp(escapedTag, 'g'), value);
  });
  
  return rendered;
};

export function TemplatePreview({ template, open, onOpenChange }: TemplatePreviewProps) {
  const sampleData = generateSampleData();
  const renderedContent = renderWithSampleData(template.content, sampleData);
  const renderedSubject = template.subject 
    ? renderWithSampleData(template.subject, sampleData) 
    : null;

  const TypeIcon = {
    email: Mail,
    sms: MessageSquare,
    document: FileText,
  }[template.template_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>{template.name}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{templateTypeLabels[template.template_type]}</Badge>
            {template.category && <Badge variant="secondary">{template.category.name}</Badge>}
            <span>v{template.current_version}</span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="preview" className="mt-0">
              <div className="space-y-4">
                {template.template_type === 'email' && renderedSubject && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                    <p className="text-sm font-medium">{renderedSubject}</p>
                  </div>
                )}

                <div>
                  {template.template_type === 'email' && (
                    <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                  )}
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                    {renderedContent}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
                  <p className="font-medium mb-1">Sample Data Used:</p>
                  <p>This preview uses example values for all merge fields. Actual values will come from the selected entity at send time.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="source" className="mt-0">
              <div className="space-y-4">
                {template.template_type === 'email' && template.subject && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                    <div className="bg-muted/50 rounded p-2 font-mono text-sm">
                      {template.subject}
                    </div>
                  </div>
                )}

                <div>
                  {template.template_type === 'email' && (
                    <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                  )}
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap font-mono text-sm">
                    {template.content}
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
