import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

/** Top-bar quick search across leads, clients, and litigation matters. */
export function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const q = useGlobalSearch(term);
  const groups = q.data ?? [];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (to: string) => {
    navigate(to);
    setTerm("");
    setOpen(false);
  };

  const showPanel = open && term.trim().length >= 2;

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search leads, clients, matters…"
          className="h-9 w-full bg-transparent text-sm outline-none"
        />
        {term && (
          <button
            onClick={() => {
              setTerm("");
              setOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[90vw] overflow-hidden rounded-md border bg-popover shadow-md">
          {q.isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          ) : groups.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {groups.map((g) => (
                <div key={g.group}>
                  <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.group}
                  </p>
                  {g.items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => go(it.to)}
                      className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted"
                    >
                      <span className="text-sm">{it.label}</span>
                      {it.sublabel && (
                        <span className="text-xs text-muted-foreground">{it.sublabel}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
