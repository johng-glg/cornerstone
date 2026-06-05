import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  useAddSettlement,
  useClientServiceContext,
  useClientForthContactId,
} from "@/hooks/useSettlements";
import { useClientTimeline } from "@/hooks/useForecast";
import { useRecordActivity } from "@/hooks/useActivityLog";
import { formatCurrency } from "@/lib/format";
import {
  buildCadenceSchedule,
  grossSavings,
  netSavings,
  performanceFee,
  projectOfferFeasibility,
  scheduleReconciles,
  scheduleSum,
  settlementPercent,
  splitFee,
  type Cadence,
  type FeeMethod,
  type ScheduledPayment,
} from "@/lib/settlementMath";

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  liabilityId: string;
  clientServiceId: string;
  clientId?: string | null;
  enrolledBalance: number | null;
  currentBalance: number | null;
  creditorName: string | null;
  accountNumber: string | null;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          tone === "good"
            ? "text-sm font-semibold text-green-700"
            : tone === "bad"
              ? "text-sm font-semibold text-destructive"
              : "text-sm font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

/** Rich settlement builder: creditor context, settlement math, editable schedule, fee preview, and
 * a live escrow-feasibility check — replaces the basic "new offer" form on a liability. */
export function SettlementBuilderDialog({
  liabilityId,
  clientServiceId,
  clientId,
  enrolledBalance,
  currentBalance,
  creditorName,
  accountNumber,
}: Props) {
  const [open, setOpen] = useState(false);
  const add = useAddSettlement();
  const record = useRecordActivity();
  const ctx = useClientServiceContext(clientServiceId);
  const contactId = useClientForthContactId(clientId);
  const timeline = useClientTimeline(contactId.data ?? null);

  const [offerAmount, setOfferAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"lump_sum" | "payment_plan">("lump_sum");
  const [count, setCount] = useState(3);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [firstDate, setFirstDate] = useState(today());
  const [feeMethod, setFeeMethod] = useState<FeeMethod>("split");
  const [feeOffset, setFeeOffset] = useState(0);
  const [feeOverride, setFeeOverride] = useState(""); // editable Settlement Fee ($)
  const [maintainMin, setMaintainMin] = useState(0); // Maintain Min Balance (floor)
  const [schedule, setSchedule] = useState<ScheduledPayment[]>([]);
  const [notes, setNotes] = useState("");

  const enrolled = enrolledBalance ?? 0;
  const offer = Number(offerAmount) || 0;
  const feeRate = ctx.data?.settlement_fee_percentage ?? null;

  // Regenerate the schedule whenever a generator input changes (manual row edits below persist until
  // one of these changes again).
  useEffect(() => {
    if (paymentType === "lump_sum") {
      setSchedule(offer > 0 ? [{ due_date: firstDate || today(), amount: offer }] : []);
    } else {
      setSchedule(buildCadenceSchedule(offer, count, firstDate || today(), cadence));
    }
  }, [paymentType, offer, count, cadence, firstDate]);

  const pct = settlementPercent(offer, enrolled);
  const savings = grossSavings(enrolled, offer);
  const defaultFee = performanceFee(savings, feeRate); // CONFIRM basis with GLG (rate × savings)
  const fee = feeOverride !== "" ? Number(feeOverride) || 0 : defaultFee;
  const net = netSavings(enrolled, offer, fee);
  const feePerPayment = useMemo(
    () => splitFee(fee, schedule, feeMethod, feeOffset, firstDate || today()),
    [fee, schedule, feeMethod, feeOffset, firstDate],
  );
  const sum = scheduleSum(schedule);
  const reconciles = scheduleReconciles(schedule, offer);

  // EPF outflows aligned to the schedule, and the client's existing transaction timeline.
  const draftFees = useMemo(
    () =>
      schedule
        .map((p, i) => ({ due_date: p.due_date, amount: feePerPayment[i] ?? 0 }))
        .filter((f) => f.amount > 0),
    [schedule, feePerPayment],
  );
  const existingTx = useMemo(
    () =>
      (timeline.data ?? []).map((t) => ({
        process_date: t.process_date,
        net_amount: t.net_amount,
      })),
    [timeline.data],
  );
  // Port of VW_MASS_SETTLEMENT_OFFER_CALCULATIONS for this draft offer.
  const feas = useMemo(
    () => projectOfferFeasibility(existingTx, schedule, draftFees, maintainMin),
    [existingTx, schedule, draftFees, maintainMin],
  );
  const hasTimeline = (timeline.data ?? []).length > 0;

  const editRow = (i: number, patch: Partial<ScheduledPayment>) =>
    setSchedule((s) => s.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setSchedule((s) => s.filter((_, k) => k !== i));
  const addRow = () =>
    setSchedule((s) => [...s, { due_date: s.at(-1)?.due_date ?? firstDate ?? today(), amount: 0 }]);

  const canSave = offer > 0 && schedule.length > 0 && (paymentType === "lump_sum" || reconciles);

  const reset = () => {
    setOfferAmount("");
    setPaymentType("lump_sum");
    setCount(3);
    setCadence("monthly");
    setFirstDate(today());
    setFeeMethod("split");
    setFeeOffset(0);
    setFeeOverride("");
    setMaintainMin(0);
    setNotes("");
  };

  const save = async () => {
    try {
      await add.mutateAsync({
        liability_id: liabilityId,
        offer_amount: offer,
        offer_percentage: pct,
        payment_type: paymentType,
        number_of_payments: schedule.length,
        first_payment_date: schedule[0]?.due_date ?? firstDate,
        fee_collection_method: feeMethod,
        fee_start_offset_months: feeOffset,
        payment_schedule: schedule,
        notes: notes || null,
      });
      await record({
        entityType: "liability",
        entityId: liabilityId,
        clientId,
        category: "settlement",
        description: `Settlement offer of ${formatCurrency(offer)} created`,
        metadata: { offer_amount: offer, payment_type: paymentType, settlement_percent: pct },
      });
      toast.success("Settlement offer added.");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New offer</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Settlement builder</DialogTitle>
          <DialogDescription>
            {creditorName ?? "Creditor"}
            {accountNumber ? ` ••••${accountNumber}` : ""} · enrolled {formatCurrency(enrolled)} ·
            current {formatCurrency(currentBalance)}
          </DialogDescription>
        </DialogHeader>

        {/* Offer inputs */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="offer">Offer amount ($)</Label>
            <Input
              id="offer"
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Payment type</Label>
            <Select
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as typeof paymentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lump_sum">Lump sum</SelectItem>
                <SelectItem value="payment_plan">Payment plan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="first">First payment</Label>
            <Input
              id="first"
              type="date"
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
            />
          </div>
          {paymentType === "payment_plan" && (
            <>
              <div>
                <Label htmlFor="count"># payments</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <Label>Cadence</Label>
                <Select value={cadence} onValueChange={(v) => setCadence(v as Cadence)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Offer terms (settlement math) */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Original" value={formatCurrency(enrolled)} />
          <Metric label="Settlement %" value={pct != null ? `${pct}%` : "—"} />
          <Metric
            label={`Settlement fee${feeRate != null ? ` (${feeRate}%)` : ""}`}
            value={formatCurrency(fee)}
          />
          <Metric
            label="Offer total savings"
            value={formatCurrency(net)}
            tone={net > 0 ? "good" : undefined}
          />
        </div>

        {/* Funds availability — port of VW_MASS_SETTLEMENT_OFFER_CALCULATIONS */}
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Funds availability</span>
            <span
              className={
                feas.feasible
                  ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                  : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
              }
            >
              {feas.verdict ?? "—"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <Label htmlFor="floor">Maintain min balance ($)</Label>
              <Input
                id="floor"
                type="number"
                value={maintainMin}
                onChange={(e) => setMaintainMin(Number(e.target.value) || 0)}
                className="h-8"
              />
            </div>
            <Metric
              label="Min running balance"
              value={formatCurrency(feas.minRunningBalance)}
              tone={feas.feasible ? "good" : "bad"}
            />
            <Metric
              label="Additional funds needed"
              value={feas.additionalFundsNeeded ? formatCurrency(feas.additionalFundsNeeded) : "—"}
              tone={feas.additionalFundsNeeded ? "bad" : undefined}
            />
          </div>
          {!hasTimeline && (
            <p className="mt-2 text-xs text-muted-foreground">
              No synced Forth transactions for this client yet — run the mirror sync to compute the
              running balance.
            </p>
          )}
        </div>

        {/* Editable schedule + fee preview */}
        <div className="rounded-md border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Payment schedule</span>
            <div className="flex items-center gap-2 text-xs">
              <span className={reconciles ? "text-green-700" : "text-destructive"}>
                {formatCurrency(sum)} / {formatCurrency(offer)}
                {reconciles ? " ✓" : " — must reconcile"}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs">
                <tr>
                  <th className="px-3 py-1.5 font-medium">#</th>
                  <th className="px-3 py-1.5 font-medium">Date</th>
                  <th className="px-3 py-1.5 font-medium">Amount</th>
                  <th className="px-3 py-1.5 font-medium">Fee</th>
                  <th className="px-3 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {schedule.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="date"
                        value={p.due_date}
                        onChange={(e) => editRow(i, { due_date: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={p.amount}
                        onChange={(e) => editRow(i, { amount: Number(e.target.value) || 0 })}
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {formatCurrency(feePerPayment[i] ?? 0)}
                    </td>
                    <td className="px-3 py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(i)}
                        disabled={schedule.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fee collection */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="fee">Settlement fee ($)</Label>
            <Input
              id="fee"
              type="number"
              value={feeOverride}
              onChange={(e) => setFeeOverride(e.target.value)}
              placeholder={String(defaultFee)}
            />
          </div>
          <div>
            <Label>Fee collection</Label>
            <Select value={feeMethod} onValueChange={(v) => setFeeMethod(v as FeeMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="split">Split across payments</SelectItem>
                <SelectItem value="lump_sum">Lump sum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="offset">Fee start offset (months)</Label>
            <Input
              id="offset"
              type="number"
              min={0}
              value={feeOffset}
              onChange={(e) => setFeeOffset(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave || add.isPending}>
            {add.isPending ? "Saving…" : "Create offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
