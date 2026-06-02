import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCourtCalendar, type CalendarHearingRow } from "@/hooks/useModules";
import { QueryState } from "@/components/common/QueryState";
import { Card, CardContent } from "@/components/ui/card";
import { titleCase } from "@/lib/format";

function fmtDay(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function CourtCalendar() {
  const q = useCourtCalendar();
  const navigate = useNavigate();
  const rows = q.data ?? [];

  const byDay = useMemo(() => {
    const groups = new Map<string, CalendarHearingRow[]>();
    for (const h of rows) {
      const key = h.scheduled_date ?? "Unscheduled";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    return [...groups.entries()];
  }, [rows]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Court Calendar</h1>
        <p className="text-sm text-muted-foreground">Upcoming hearings across all matters.</p>
      </div>

      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        isEmpty={(q.data ?? []).length === 0}
        emptyMessage="No upcoming hearings scheduled."
      >
        <div className="space-y-5">
          {byDay.map(([day, hearings]) => (
            <div key={day}>
              <h2 className="mb-2 text-sm font-semibold text-guardian-navy">{fmtDay(day)}</h2>
              <div className="space-y-2">
                {hearings.map((h) => (
                  <Card
                    key={h.id}
                    onClick={() => navigate(`/litigation/${h.matter_id}`)}
                    className="cursor-pointer transition-colors hover:border-guardian-gold"
                  >
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {titleCase(h.hearing_type)}
                          {h.litigation_matters?.case_number && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {h.litigation_matters.case_number}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            h.litigation_matters?.court_name,
                            h.location,
                            h.judge_name && `Judge ${h.judge_name}`,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-guardian-gold">View matter →</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
