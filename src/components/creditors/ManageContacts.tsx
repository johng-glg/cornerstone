import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  useCreditorContacts,
  useAddCreditorContact,
  useRemoveCreditorContact,
} from "@/hooks/useCreditorContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ManageContacts({
  creditorId,
  creditorName,
}: {
  creditorId: string;
  creditorName: string;
}) {
  const contacts = useCreditorContacts(creditorId);
  const add = useAddCreditorContact(creditorId);
  const remove = useRemoveCreditorContact(creditorId);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const reset = () => {
    setFirst("");
    setLast("");
    setTitle("");
    setEmail("");
    setPhone("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-xs">
          Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creditorName} — contacts</DialogTitle>
        </DialogHeader>

        <ul className="space-y-2">
          {(contacts.data ?? []).map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 rounded-md border p-2">
              <div className="text-sm">
                <p className="font-medium">
                  {c.first_name} {c.last_name}
                  {c.title ? ` · ${c.title}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <button
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(c.id, {
                    onSuccess: () => toast.success("Removed."),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
          {(contacts.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">No contacts yet.</li>
          )}
        </ul>

        <div className="space-y-2 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="First name"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
            <Input placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
            <Input
              className="col-span-2"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button
            size="sm"
            disabled={add.isPending || !first.trim() || !last.trim()}
            onClick={() =>
              add.mutate(
                {
                  first_name: first.trim(),
                  last_name: last.trim(),
                  title: title.trim() || null,
                  email: email.trim() || null,
                  phone: phone.trim() || null,
                },
                {
                  onSuccess: () => {
                    toast.success("Contact added.");
                    reset();
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {add.isPending ? "Adding…" : "Add contact"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
