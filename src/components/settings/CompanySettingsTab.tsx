import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMyCompany, useUpdateCompany } from "@/hooks/useSettings";
import { QueryState } from "@/components/common/QueryState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CompanySettingsTab() {
  const q = useMyCompany();
  const update = useUpdateCompany();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    if (q.data) {
      setName(q.data.name);
      setCity(q.data.city ?? "");
      setState(q.data.state ?? "");
    }
  }, [q.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Company</CardTitle>
        <CardDescription>Your firm's information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryState isLoading={q.isLoading} error={q.error} isEmpty={!q.data}>
          {q.data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cname">Name</Label>
                  <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ccity">City</Label>
                  <Input id="ccity" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cstate">State</Label>
                  <Input id="cstate" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
              <Button
                disabled={update.isPending || !name.trim()}
                onClick={() =>
                  update.mutate(
                    { id: q.data!.id, name: name.trim(), city: city.trim(), state: state.trim() },
                    {
                      onSuccess: () => toast.success("Company saved."),
                      onError: (e) => toast.error(e.message),
                    },
                  )
                }
              >
                {update.isPending ? "Saving…" : "Save company"}
              </Button>
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}
