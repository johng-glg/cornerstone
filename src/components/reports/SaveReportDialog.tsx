import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSaveReportTemplate } from '@/hooks/useReportTemplates';
import type { ReportConfig } from '@/types/reports';

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string;
  config: ReportConfig;
  companyId: string;
  staffId: string;
}

export function SaveReportDialog({
  open,
  onOpenChange,
  module,
  config,
  companyId,
  staffId,
}: SaveReportDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const saveTemplate = useSaveReportTemplate();

  const handleSave = () => {
    if (!name.trim()) return;

    saveTemplate.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        module,
        config,
        isPublic,
        companyId,
        createdBy: staffId,
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setIsPublic(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Report Template</DialogTitle>
          <DialogDescription>
            Save this report configuration for easy re-use later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Report Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter report name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Share with Team</Label>
              <p className="text-sm text-muted-foreground">
                Allow other team members to use this template
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || saveTemplate.isPending}
          >
            {saveTemplate.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
