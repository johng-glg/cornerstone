import { useState } from 'react';
import { Plus, FileText, Download, Trash2, ExternalLink } from 'lucide-react';
import { SignedDocumentLink } from '@/components/storage/SignedDocumentLink';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import {
  useClientDocuments,
  useDeleteClientDocument,
  DOCUMENT_TYPES,
  type ClientDocument,
} from '@/hooks/useClientDocuments';
import { ClientDocumentFormDialog } from '../ClientDocumentFormDialog';

interface ClientDocumentsTabProps {
  clientId: string;
}

export function ClientDocumentsTab({ clientId }: ClientDocumentsTabProps) {
  const { data: documents, isLoading } = useClientDocuments(clientId);
  const deleteDocument = useDeleteClientDocument();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ClientDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<ClientDocument | null>(null);

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const handleDelete = () => {
    if (deletingDocument) {
      deleteDocument.mutate(
        { id: deletingDocument.id, clientId },
        { onSuccess: () => setDeletingDocument(null) }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      {documents && documents.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{doc.title}</span>
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[300px]">
                          {doc.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.uploader
                        ? `${doc.uploader.first_name} ${doc.uploader.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View document"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingDocument(doc)}
                          title="Edit document"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingDocument(doc)}
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No Documents</h4>
            <p className="text-muted-foreground mb-4">
              Upload contracts, IDs, and other client documents.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Document Dialog */}
      <ClientDocumentFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        clientId={clientId}
      />

      {/* Edit Document Dialog */}
      <ClientDocumentFormDialog
        open={!!editingDocument}
        onOpenChange={(open) => !open && setEditingDocument(null)}
        clientId={clientId}
        document={editingDocument || undefined}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDocument} onOpenChange={(open) => !open && setDeletingDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingDocument?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
