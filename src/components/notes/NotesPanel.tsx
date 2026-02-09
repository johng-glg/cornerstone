import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useNotes, useCreateNote, useDeleteNote } from '@/hooks/useNotes';
import { NoteInput } from './NoteInput';
import { NotesList } from './NotesList';

interface NotesPanelProps {
  entityType: string;
  entityId: string;
  title?: string;
  maxHeight?: string;
  /** Render as a plain div instead of a Card */
  flat?: boolean;
}

export function NotesPanel({ entityType, entityId, title = 'Notes', maxHeight = '400px', flat }: NotesPanelProps) {
  const { data: notes, isLoading } = useNotes(entityType, entityId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const handleSubmit = async (content: string) => {
    await createNote.mutateAsync({ entityType, entityId, content });
  };

  const handleDelete = (noteId: string) => {
    deleteNote.mutate({ id: noteId, entityType, entityId });
  };

  const content = (
    <>
      <NoteInput onSubmit={handleSubmit} isPending={createNote.isPending} />
      <div className="mt-4">
        <NotesList
          notes={notes}
          isLoading={isLoading}
          onDelete={handleDelete}
          maxHeight={maxHeight}
        />
      </div>
    </>
  );

  if (flat) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {title}
        </h4>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
