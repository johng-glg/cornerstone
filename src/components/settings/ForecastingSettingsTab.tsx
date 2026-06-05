import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryState } from "@/components/common/QueryState";
import { useSystemSettings, useUpdateSystemSetting } from "@/hooks/useSystemSettings";

interface Field {
  key: string;
  label: string;
  hint: string;
  step?: string;
}

const FIELDS: Field[] = [
  {
    key: "min_balance_floor",
    label: "Minimum balance floor ($)",
    hint: "Projected escrow below this is flagged as a breach (the chart's floor line + alerts).",
  },
  {
    key: "incidental_buffer_per_payment",
    label: "Incidental buffer per payment ($)",
    hint: "Added to each scheduled creditor payment when projecting (matches Forth's $6 custodial buffer).",
  },
  {
    key: "default_fee_rate",
    label: "Default fee rate (decimal)",
    hint: "Fallback performance-fee rate for synced offers, e.g. 0.27 = 27%.",
    step: "0.01",
  },
  {
    key: "alert_horizon_days",
    label: "Alert horizon (days)",
    hint: "Only breaches within this many days raise an alert.",
    step: "1",
  },
];

/** Admin-only firm-wide forecasting thresholds (public.system_setting). */
export function ForecastingSettingsTab() {
  const settings = useSystemSettings();
  const update = useUpdateSystemSetting();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings.data) setDraft((d) => ({ ...settings.data, ...d }));
  }, [settings.data]);

  const save = () => {
    const entries = FIELDS.map((f) => ({ key: f.key, value: (draft[f.key] ?? "").trim() })).filter(
      (e) => e.value !== "" && e.value !== (settings.data?.[e.key] ?? ""),
    );
    if (entries.length === 0) {
      toast.info("No changes to save.");
      return;
    }
    update.mutate(entries, {
      onSuccess: () => toast.success("Forecasting settings saved."),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Forecasting thresholds</CardTitle>
        <CardDescription>
          Firm-wide defaults for the settlement forecasting engine. A single offer can still
          override the floor via “Maintain min balance” in the settlement builder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={settings.isLoading}
          error={settings.error}
          isEmpty={false}
          emptyMessage=""
        >
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  step={f.step ?? "0.01"}
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  className="max-w-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
              </div>
            ))}
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}
