import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { MessageSquare, AtSign } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEntityNotes, useAddNote } from "@/hooks/useLeadTabs";
import { useRecordActivity } from "@/hooks/useActivityLog";
import { useStaffList } from "@/hooks/useModules";
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
  const record = useRecordActivity();
  const staffList = useStaffList();
  const [draft, setDraft] = useState("");
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [tagOpen, setTagOpen] = useState(false);

  const others = (staffList.data ?? []).filter((s) => s.id !== staff?.id);

  const submit = () => {
    const content = draft.trim();
    if (!content) return;
    addNote.mutate(
      { content, mentioned_staff_ids: [...tagged] },
      {
        onSuccess: () => {
          void record({
            entityType,
            entityId,
            clientId: entityType === "client" ? entityId : undefined,
            category: "note",
            description: `Note added: "${content.slice(0, 80)}${content.length > 80 ? "…" : ""}"`,
          });
          setDraft("");
          setTagged(new Set());
          setTagOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
  };

  const toggleTag = (id: string) =>
    setTagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
        <div className="mt-2 flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTagOpen((o) => !o)}
            >
              <AtSign className="mr-1 h-3.5 w-3.5" />
              Tag{tagged.size > 0 ? ` (${tagged.size})` : ""}
            </Button>
            {tagOpen && (
              <div className="absolute left-0 top-8 z-50 max-h-56 w-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Notify
                </p>
                {others.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={tagged.has(s.id)}
                      onChange={() => toggleTag(s.id)}
                    />
                    {s.first_name} {s.last_name}
                  </label>
                ))}
                {others.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">No other staff.</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to submit</p>
        </div>
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
