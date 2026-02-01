import { FileText, Calendar, Clock, Trash2, ExternalLink, Plus, AlertTriangle } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
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
import { useLitigationDocuments, type LitigationDocument } from '@/hooks/useLitigationDocuments';

interface LitigationDocumentListProps {
  matterId: string;
  onAddDocument: () => void;
  onDeleteDocument: (docId: string) => void;
}

const documentTypeLabels: Record<string, string> = {
  complaint: 'Complaint',
  answer: 'Answer',
  motion: 'Motion',
  discovery: 'Discovery',
  subpoena: 'Subpoena',
  order: 'Court Order',
  settlement_agreement: 'Settlement Agreement',
  other: 'Other',
};

const documentTypeBadgeColors: Record<string, string> = {
  complaint: 'bg-red-100 text-red-700',
  answer: 'bg-blue-100 text-blue-700',
  motion: 'bg-purple-100 text-purple-700',
  discovery: 'bg-orange-100 text-orange-700',
  subpoena: 'bg-yellow-100 text-yellow-700',
  order: 'bg-green-100 text-green-700',
  settlement_agreement: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700',
};

export function LitigationDocumentList({ matterId, onAddDocument, onDeleteDocument }: LitigationDocumentListProps) {
  const { data: documents, isLoading } = useLitigationDocuments(matterId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const hasDeadlines = documents?.some(d => d.deadline_date && !d.filed_date);
  const urgentDeadlines = documents?.filter(d => {
    if (!d.deadline_date || d.filed_date) return false;
    const deadline = new Date(d.deadline_date);
    return differenceInDays(deadline, new Date()) <= 7 && !isPast(deadline);
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Documents & Filings</h3>
        <Button variant="outline" size="sm" onClick={onAddDocument}>
          <Plus className="h-4 w-4 mr-1" />
          Add Document
        </Button>
      </div>

      {urgentDeadlines.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium text-sm">Upcoming Filing Deadlines</span>
          </div>
          <div className="mt-2 space-y-1">
            {urgentDeadlines.map(doc => (
              <p key={doc.id} className="text-sm text-yellow-700">
                {doc.title} - Due {format(new Date(doc.deadline_date!), 'MMM d, yyyy')}
              </p>
            ))}
          </div>
        </div>
      )}

      {documents && documents.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <DocumentRow key={doc.id} document={doc} onDelete={onDeleteDocument} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No documents added yet</p>
        </div>
      )}
    </div>
  );
}

function DocumentRow({ document, onDelete }: { document: LitigationDocument; onDelete: (id: string) => void }) {
  const hasOverdueDeadline = document.deadline_date && 
    !document.filed_date && 
    isPast(new Date(document.deadline_date));

  return (
    <TableRow className={hasOverdueDeadline ? 'bg-red-50' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{document.title}</p>
            {document.notes && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{document.notes}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={documentTypeBadgeColors[document.document_type] || 'bg-gray-100 text-gray-700'}>
          {documentTypeLabels[document.document_type] || document.document_type}
        </Badge>
      </TableCell>
      <TableCell>
        {document.filed_date ? (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-3 w-3" />
            {format(new Date(document.filed_date), 'MMM d, yyyy')}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not filed</span>
        )}
      </TableCell>
      <TableCell>
        {document.deadline_date ? (
          <div className={`flex items-center gap-1 text-sm ${hasOverdueDeadline ? 'text-red-600 font-medium' : ''}`}>
            <Clock className="h-3 w-3" />
            {format(new Date(document.deadline_date), 'MMM d, yyyy')}
            {hasOverdueDeadline && <span className="text-red-600">(Overdue)</span>}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {document.file_url && (
            <Button variant="ghost" size="icon" asChild>
              <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(document.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
