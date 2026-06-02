import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUpdateClient, type ClientDetailRow } from "@/hooks/useClientDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClientEditDialog({
  client,
  open,
  onOpenChange,
}: {
  client: ClientDetailRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const update = useUpdateClient();
  const [first, setFirst] = useState(client.first_name);
  const [last, setLast] = useState(client.last_name);
  const [email, setEmail] = useState(client.email ?? "");
  const [status, setStatus] = useState(client.status ?? "active");
  const [notes, setNotes] = useState(client.notes ?? "");

  useEffect(() => {
    setFirst(client.first_name);
    setLast(client.last_name);
    setEmail(client.email ?? "");
    setStatus(client.status ?? "active");
    setNotes(client.notes ?? "");
  }, [client]);

  const save = () => {
    update.mutate(
      {
        id: client.id,
        first_name: first,
        last_name: last,
        email: email || null,
        status,
        is_active: status === "active",
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Client updated.");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First name</Label>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last name</Label>
              <Input value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
