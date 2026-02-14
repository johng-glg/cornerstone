import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadDocuments, useDeleteLeadDocument, LEAD_DOCUMENT_TYPES, type LeadDocument } from '@/hooks/useLeadDocuments';
import { LeadDocumentFormDialog } from './LeadDocumentFormDialog';
import { Plus, FileText, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { format } from 'date-fns';

interface LeadDocumentsTabProps {
  leadId: string;
}

export function LeadDocumentsTab({ leadId }: LeadDocumentsTabProps) {
  const { data: documents, isLoading } = useLeadDocuments(leadId);
  const deleteDocument = useDeleteLeadDocument();
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LeadDocument | undefined>(undefined);

  const getTypeLabel = (type: string) =>
    LEAD_DOCUMENT_TYPES.find(t => t.value === type)?.label || type;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          {documents?.length || 0} document{documents?.length !== 1 ? 's' : ''}
        </h4>
        <Button size="sm" onClick={() => { setEditingDoc(undefined); setShowForm(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Document
        </Button>
      </div>

      {!documents || documents.length === 0 ? (
        <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
          No documents attached to this lead yet.
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {getTypeLabel(doc.document_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {doc.uploader && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {doc.uploader.first_name} {doc.uploader.last_name}
                        </p>
                      )}
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditingDoc(doc); setShowForm(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteDocument.mutate({ id: doc.id, leadId })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LeadDocumentFormDialog
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingDoc(undefined); }}
        leadId={leadId}
        document={editingDoc}
      />
    </div>
  );
}
