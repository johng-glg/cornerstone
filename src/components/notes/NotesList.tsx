import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrentStaff } from '@/hooks/useStaff';
import type { Note } from '@/hooks/useNotes';
import React from 'react';

interface NotesListProps {
  notes: Note[] | undefined;
  isLoading: boolean;
  onDelete?: (noteId: string) => void;
  maxHeight?: string;
}

// Render note content with highlighted @mentions
function renderContent(content: string) {
  const parts = content.split(/(@\[.+?\]\([0-9a-f-]+\))/g);
  return parts.map((part, i) => {
    const mentionMatch = part.match(/@\[(.+?)\]\(([0-9a-f-]+)\)/);
    if (mentionMatch) {
      return (
        <span key={i} className="bg-primary/10 text-primary font-medium rounded px-1">
          @{mentionMatch[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function NotesList({ notes, isLoading, onDelete, maxHeight = '400px' }: NotesListProps) {
  const { data: currentStaff } = useCurrentStaff();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No notes yet</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }}>
      <div className="space-y-3 pr-2">
        {notes.map((note) => (
          <div key={note.id} className="border rounded-lg p-3 bg-card group">
            <div className="flex items-start gap-2.5">
              <Avatar className="h-7 w-7 mt-0.5">
                <AvatarImage src={note.author?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {note.author?.first_name?.[0]}{note.author?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {note.author?.first_name} {note.author?.last_name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                    {onDelete && currentStaff?.id === note.created_by && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDelete(note.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap mt-1">
                  {renderContent(note.content)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
