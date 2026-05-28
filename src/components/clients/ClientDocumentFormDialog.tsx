import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentStaff } from '@/hooks/useStaff';
import {
  useCreateClientDocument,
  useUpdateClientDocument,
  DOCUMENT_TYPES,
  type ClientDocument,
} from '@/hooks/useClientDocuments';
import { validateDocumentUpload, DOCUMENT_ACCEPT_ATTR } from '@/lib/storage';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  document_type: z.string().min(1, 'Document type is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ClientDocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  document?: ClientDocument;
}

export function ClientDocumentFormDialog({
  open,
  onOpenChange,
  clientId,
  document,
}: ClientDocumentFormDialogProps) {
  const { data: currentStaff } = useCurrentStaff();
  const createDocument = useCreateClientDocument();
  const updateDocument = useUpdateClientDocument();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!document;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      document_type: 'other',
      notes: '',
    },
  });

  useEffect(() => {
    if (document) {
      form.reset({
        title: document.title,
        document_type: document.document_type,
        notes: document.notes || '',
      });
      setUploadedUrl(document.file_url);
    } else {
      form.reset({
        title: '',
        document_type: 'other',
        notes: '',
      });
      setUploadedUrl(null);
      setFileName(null);
    }
  }, [document, form]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateDocumentUpload(file);
    if (err) {
      toast({ title: 'File rejected', description: err.message, variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    // Auto-fill title from filename if empty
    if (!form.getValues('title')) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      form.setValue('title', nameWithoutExt);
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Phase 7: bucket is private — persist the path only; viewers resolve signed URLs.
      setUploadedUrl(data.path);
      toast({ title: 'File uploaded successfully' });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedUrl(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateDocument.mutate(
        {
          id: document.id,
          title: data.title,
          document_type: data.document_type,
          notes: data.notes || undefined,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      if (!uploadedUrl) {
        toast({
          title: 'No file uploaded',
          description: 'Please upload a document file',
          variant: 'destructive',
        });
        return;
      }

      createDocument.mutate(
        {
          client_id: clientId,
          title: data.title,
          document_type: data.document_type,
          file_url: uploadedUrl,
          notes: data.notes || undefined,
          uploaded_by: currentStaff?.id,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isPending = createDocument.isPending || updateDocument.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Document' : 'Add Document'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the document details.'
              : 'Upload a document and provide details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* File Upload (only for new documents) */}
            {!isEditing && (
              <div className="space-y-2">
                <FormLabel>File</FormLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={DOCUMENT_ACCEPT_ATTR}
                />

                {uploadedUrl ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileName || 'Uploaded document'}
                      </p>
                      <a
                        href={uploadedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View file
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </>
                    )}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PDF, Office docs, images, .eml/.msg (max 25 MB)
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Document title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="document_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this document..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isUploading}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? 'Saving...' : 'Adding...'}
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Add Document'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
