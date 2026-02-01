import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLitigationDocument } from '@/hooks/useLitigationDocuments';

const documentSchema = z.object({
  document_type: z.string().min(1, 'Document type is required'),
  title: z.string().min(1, 'Title is required'),
  file_url: z.string().optional(),
  filed_date: z.string().optional(),
  deadline_date: z.string().optional(),
  notes: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface LitigationDocumentFormDialogProps {
  matterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentTypes = [
  { value: 'complaint', label: 'Complaint' },
  { value: 'answer', label: 'Answer' },
  { value: 'motion', label: 'Motion' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'subpoena', label: 'Subpoena' },
  { value: 'order', label: 'Court Order' },
  { value: 'settlement_agreement', label: 'Settlement Agreement' },
  { value: 'other', label: 'Other' },
];

export function LitigationDocumentFormDialog({
  matterId,
  open,
  onOpenChange,
}: LitigationDocumentFormDialogProps) {
  const createDocument = useCreateLitigationDocument();

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      document_type: '',
      title: '',
      file_url: '',
      filed_date: '',
      deadline_date: '',
      notes: '',
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    await createDocument.mutateAsync({
      matter_id: matterId,
      document_type: data.document_type,
      title: data.title,
      file_url: data.file_url || null,
      filed_date: data.filed_date || null,
      deadline_date: data.deadline_date || null,
      notes: data.notes || null,
      uploaded_by: null, // Will be set by current user in a future enhancement
    });
    
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {documentTypes.map((type) => (
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
              name="file_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="filed_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filed Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDocument.isPending}>
                Add Document
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
