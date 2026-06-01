import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEntityNotes, useAddNote } from "@/hooks/useLeadTabs";
import { QueryState } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NotesTab({
  entityId,
  entityType = "lead",
}: {
  entityId: string;
  entityType?: string;
}) {
  const { staff } = useAuth();
  const notes = useEntityNotes(entityType, entityId);
  const addNote = useAddNote(entityType, entityId, staff?.id);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const content = draft.trim();
    if (!content) return;
    addNote.mutate(
      { content },
      {
        onSuccess: () => setDraft(""),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3">
        <div className="flex items-start gap-2">
          <Textarea
            rows={3}
            placeholder="Write a note…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <Button size="icon" disabled={addNote.isPending || !draft.trim()} onClick={submit}>
            ↑
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Press ⌘/Ctrl + Enter to submit</p>
      </div>

      <QueryState
        isLoading={notes.isLoading}
        error={notes.error}
        isEmpty={(notes.data ?? []).length === 0}
        emptyMessage="No notes yet."
      >
        <ul className="space-y-2">
          {(notes.data ?? []).map((n) => (
            <li key={n.id} className="rounded-md border p-3">
              <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </QueryState>

      {(notes.data ?? []).length === 0 && !notes.isLoading && (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <MessageSquare className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
