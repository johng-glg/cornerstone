import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateLeadDocument, useUpdateLeadDocument, LEAD_DOCUMENT_TYPES, type LeadDocument } from '@/hooks/useLeadDocuments';
import { useCurrentStaff } from '@/hooks/useStaff';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface LeadDocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  document?: LeadDocument;
}

export function LeadDocumentFormDialog({ open, onOpenChange, leadId, document }: LeadDocumentFormDialogProps) {
  const createDocument = useCreateLeadDocument();
  const updateDocument = useUpdateLeadDocument();
  const { data: currentStaff } = useCurrentStaff();
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('other');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const isEditing = !!document;

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setDocumentType(document.document_type);
      setNotes(document.notes || '');
    } else {
      setTitle('');
      setDocumentType('other');
      setNotes('');
      setFile(null);
    }
  }, [document, open]);

  const handleSubmit = async () => {
    if (isEditing) {
      await updateDocument.mutateAsync({
        id: document.id,
        leadId,
        title,
        document_type: documentType,
        notes: notes || null,
      });
      onOpenChange(false);
      return;
    }

    if (!file || !title) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${leadId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('lead-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lead-documents')
        .getPublicUrl(filePath);

      await createDocument.mutateAsync({
        lead_id: leadId,
        document_type: documentType,
        title,
        file_url: publicUrl,
        notes: notes || undefined,
        uploaded_by: currentStaff?.id,
      });

      setTitle('');
      setDocumentType('other');
      setNotes('');
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const isPending = createDocument.isPending || updateDocument.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Document' : 'Upload Document'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isEditing && (
            <div>
              <Label>File *</Label>
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
                  }
                }}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="mt-1" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {LEAD_DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={(!isEditing && (!file || !title)) || uploading || isPending}>
            {(uploading || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
