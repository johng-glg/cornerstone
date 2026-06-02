import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useUpdateProfile } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ProfileSettingsTab() {
  const { staff, roles } = useAuth();
  const update = useUpdateProfile();
  const initialTitle = (staff as { job_title?: string | null } | null)?.job_title ?? "";
  const [first, setFirst] = useState(staff?.first_name ?? "");
  const [last, setLast] = useState(staff?.last_name ?? "");
  const [title, setTitle] = useState(initialTitle);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile</CardTitle>
        <CardDescription>Your account details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="first">First name</Label>
            <Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="last">Last name</Label>
            <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="title">Job title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Email: {staff?.email ?? "—"}</p>
          <p>Roles: {roles.length ? roles.join(", ") : "—"}</p>
        </div>
        <Button
          disabled={update.isPending || !first.trim() || !last.trim()}
          onClick={() =>
            update.mutate(
              { first_name: first.trim(), last_name: last.trim(), job_title: title.trim() || null },
              {
                onSuccess: () => toast.success("Profile saved."),
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          {update.isPending ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
