import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { MessageSquare, AtSign } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEntityNotes, useAddNote } from "@/hooks/useLeadTabs";
import { useRecordActivity } from "@/hooks/useActivityLog";
import { useStaffList } from "@/hooks/useModules";
import { QueryState } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 10;

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
}

/** Detect an in-progress `@mention` ending at the caret. The query must be space-free so a
 *  completed "@First Last " no longer re-triggers the dropdown. */
function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const upto = text.slice(0, caret);
  const at = upto.lastIndexOf("@");
  if (at < 0) return null;
  const before = at === 0 ? " " : upto[at - 1];
  if (!/\s/.test(before)) return null; // must follow whitespace/start (not mid-word like an email)
  const query = upto.slice(at + 1);
  if (/\s/.test(query) || query.length > 30) return null;
  return { start: at, query };
}

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
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState("");
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [page, setPage] = useState(0);

  const others = useMemo<StaffOption[]>(
    () => (staffList.data ?? []).filter((s) => s.id !== staff?.id),
    [staffList.data, staff?.id],
  );
  const matches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return others
      .filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mention, others]);

  const taggedNames = useMemo(
    () => others.filter((s) => tagged.has(s.id)).map((s) => `${s.first_name} ${s.last_name}`),
    [others, tagged],
  );

  const sync = (el: HTMLTextAreaElement) => {
    setDraft(el.value);
    setMention(activeMention(el.value, el.selectionStart ?? el.value.length));
  };

  const pick = (s: StaffOption) => {
    if (!mention) return;
    const name = `${s.first_name} ${s.last_name}`;
    const caret = taRef.current?.selectionStart ?? draft.length;
    const next = `${draft.slice(0, mention.start)}@${name} ${draft.slice(caret)}`;
    setDraft(next);
    setTagged((prev) => new Set(prev).add(s.id));
    const pos = mention.start + name.length + 2; // after "@Name "
    setMention(null);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

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
          setMention(null);
          setPage(0); // jump to the newest note
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && matches.length > 0 && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      pick(matches[0]);
      return;
    }
    if (mention && e.key === "Escape") {
      setMention(null);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3">
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={taRef}
              rows={3}
              placeholder="Write a note… type @ to mention a teammate"
              value={draft}
              onChange={(e) => sync(e.currentTarget)}
              onKeyUp={(e) => sync(e.currentTarget)}
              onClick={(e) => sync(e.currentTarget)}
              onKeyDown={onKeyDown}
            />
            {mention && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                {matches.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    // keep textarea focus so the click registers before blur
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(s)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${
                      i === 0 ? "bg-muted/60" : ""
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold uppercase text-primary">
                      {s.first_name[0]}
                      {s.last_name[0]}
                    </span>
                    {s.first_name} {s.last_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="icon" disabled={addNote.isPending || !draft.trim()} onClick={submit}>
            ↑
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {taggedNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium"
            >
              <AtSign className="h-3 w-3" />
              {name}
            </span>
          ))}
          <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to submit · @ to mention</p>
        </div>
      </div>

      <QueryState
        isLoading={notes.isLoading}
        error={notes.error}
        isEmpty={(notes.data ?? []).length === 0}
        emptyMessage="No notes yet."
      >
        {(() => {
          const all = notes.data ?? [];
          const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
          const safePage = Math.min(page, pageCount - 1);
          const visible = all.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
          return (
            <>
              <ul className="space-y-2">
                {visible.map((n) => {
                  const mentions = (n.note_mentions ?? [])
                    .map((m) => (m.staff ? `${m.staff.first_name} ${m.staff.last_name}` : null))
                    .filter(Boolean) as string[];
                  return (
                    <li key={n.id} className="rounded-md border p-3">
                      <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                      {mentions.length > 0 && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
                          <AtSign className="h-3 w-3 text-muted-foreground" />
                          {mentions.map((name) => (
                            <span
                              key={name}
                              className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground"
                            >
                              {name}
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.author ? `${n.author.first_name} ${n.author.last_name} · ` : ""}
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {pageCount > 1 && (
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {all.length} note{all.length === 1 ? "" : "s"} · page {safePage + 1} of{" "}
                    {pageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setPage(safePage - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage(safePage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </QueryState>

      {(notes.data ?? []).length === 0 && !notes.isLoading && (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <MessageSquare className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
