import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { LeadDetailRow, LeadDebtRow } from "@/lib/db-types";
import {
  PLAN_OPTIONS,
  PROGRAM_TERMS,
  monthlyDraft,
  planByType,
  totalProgramCost,
  type PlanType,
} from "@/lib/enrollment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency, titleCase } from "@/lib/format";

const STATES =
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  );
const EMPLOYMENT = ["employed", "unemployed", "self_employed", "retired", "disabled"];
const HARDSHIP = [
  "job_loss",
  "medical_emergency",
  "divorce",
  "reduced_income",
  "business_failure",
  "other",
];
const DEBT_TYPES = [
  "credit_card",
  "medical",
  "auto_loan",
  "personal_loan",
  "student_loan",
  "mortgage",
  "other",
];
const STEPS = [
  "Eligibility",
  "Client Info",
  "Employment",
  "Credit Auth",
  "Debts",
  "Plan",
  "Banking",
  "Review",
];
const DISCLOSURES = [
  ["credit", "Credit Score Impact"],
  ["collection", "Collection Activity"],
  ["lawsuits", "Potential Lawsuits"],
  ["negotiation", "Negotiation Process"],
  ["guarantee", "Results Not Guaranteed"],
] as const;

interface DebtDraft {
  creditor_name: string;
  account_type: string;
  original_balance: string;
  current_balance: string;
  account_number_last4: string;
}

export function EnrollmentWizard({
  lead,
  leadDebts,
  open,
  onOpenChange,
  onConverted,
}: {
  lead: LeadDetailRow;
  leadDebts: LeadDebtRow[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConverted: () => void;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Eligibility
  const [state, setState] = useState(lead.state ?? "");
  const [inBankruptcy, setInBankruptcy] = useState(lead.in_bankruptcy ?? false);
  const [federalAccounts, setFederalAccounts] = useState(false);
  const [securedResolved, setSecuredResolved] = useState(true);
  const [securityClearance, setSecurityClearance] = useState(false);
  // Client info
  const [firstName, setFirstName] = useState(lead.first_name);
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState(lead.last_name);
  const [dob, setDob] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [email, setEmail] = useState(lead.email ?? "");
  const [tcpa, setTcpa] = useState(false);
  // Employment
  const [employment, setEmployment] = useState(lead.employment_status ?? "");
  const [monthlyIncome, setMonthlyIncome] = useState(lead.monthly_income?.toString() ?? "");
  const [hardship, setHardship] = useState("");
  const [hardshipNotes, setHardshipNotes] = useState("");
  // Credit auth
  const [creditAuth, setCreditAuth] = useState(false);
  // Debts (prefilled from the lead's debts)
  const [debts, setDebts] = useState<DebtDraft[]>(
    leadDebts.length
      ? leadDebts.map((d) => ({
          creditor_name: d.creditor_name,
          account_type: d.account_type,
          original_balance: d.original_balance?.toString() ?? "",
          current_balance: d.current_balance?.toString() ?? "",
          account_number_last4: d.account_number_last4 ?? "",
        }))
      : [],
  );
  // Plan
  const [term, setTerm] = useState<number>(24);
  const [planType, setPlanType] = useState<PlanType>("glg_standard");
  const [firstPaymentDate, setFirstPaymentDate] = useState("");
  // Banking + disclosures
  const [ack, setAck] = useState<Record<string, boolean>>({});

  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + (Number(d.current_balance) || 0), 0),
    [debts],
  );
  const plan = planByType(planType);
  const draft = monthlyDraft(totalDebt, term, plan);
  const allAck = DISCLOSURES.every(([k]) => ack[k]);

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return !!state;
      case 1:
        return !!firstName.trim() && !!lastName.trim();
      case 3:
        return creditAuth;
      case 4:
        return debts.length > 0 && debts.every((d) => Number(d.current_balance) > 0);
      case 5:
        return !!term && !!planType && !!firstPaymentDate;
      case 6:
        return allAck;
      default:
        return true;
    }
  };

  const addDebt = () =>
    setDebts((d) => [
      ...d,
      {
        creditor_name: "",
        account_type: "credit_card",
        original_balance: "",
        current_balance: "",
        account_number_last4: "",
      },
    ]);
  const updateDebt = (i: number, patch: Partial<DebtDraft>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeDebt = (i: number) => setDebts((d) => d.filter((_, idx) => idx !== i));

  const submit = async () => {
    setSubmitting(true);
    const payload = {
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      email,
      date_of_birth: dob,
      ssn_last4: ssnLast4,
      tcpa_consent: tcpa,
      employment_status: employment,
      monthly_income: monthlyIncome ? Number(monthlyIncome) : null,
      hardship_notes: [hardship ? titleCase(hardship) : "", hardshipNotes]
        .filter(Boolean)
        .join(" — "),
      in_bankruptcy: inBankruptcy,
      term_months: term,
      monthly_payment: draft,
      payment_frequency: "monthly",
      first_payment_date: firstPaymentDate,
      plan_type: planType,
      settlement_fee_percentage: Math.round(plan.feePercentage * 100),
      total_enrolled_debt: totalDebt,
      debts: debts.map((d) => ({
        creditor_name: d.creditor_name,
        account_type: d.account_type,
        original_balance: d.original_balance ? Number(d.original_balance) : null,
        current_balance: Number(d.current_balance),
        account_number_last4: d.account_number_last4,
      })),
    };
    const { error } = await supabase.rpc("convert_lead_to_client", {
      _lead_id: lead.id,
      _payload: payload,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${firstName} ${lastName} enrolled.`);
    onOpenChange(false);
    onConverted();
  };

  const cb = (checked: boolean, onChange: (v: boolean) => void, label: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide">
            Consumer Defense Enrollment
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete the intake process to enroll this lead in the Consumer Defense program.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-1 py-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  i < step
                    ? "bg-guardian-gold text-guardian-navy"
                    : i === step
                      ? "border-2 border-guardian-gold text-guardian-navy"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  i === step ? "font-medium text-guardian-navy" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
            </div>
          ))}
        </div>

        <div className="min-h-[300px] space-y-4 py-2">
          {/* 1. Eligibility */}
          {step === 0 && (
            <>
              <h3 className="font-semibold">Eligibility Verification</h3>
              <div className="space-y-1">
                <Label>State of Residence *</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {cb(inBankruptcy, setInBankruptcy, "Is the client currently in active bankruptcy?")}
                {cb(
                  federalAccounts,
                  setFederalAccounts,
                  "Does the client have any federal debt accounts? (IRS, student loans, etc.)",
                )}
                {cb(
                  securedResolved,
                  setSecuredResolved,
                  "Are all secured credit issues resolved? (No active repossession, foreclosure)",
                )}
                {cb(
                  securityClearance,
                  setSecurityClearance,
                  "Does the client have a security clearance?",
                )}
              </div>
            </>
          )}

          {/* 2. Client Info */}
          {step === 1 && (
            <>
              <h3 className="font-semibold">Client Information</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>First Name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Middle Name</Label>
                  <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Last Name *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>SSN (Last 4)</Label>
                  <Input
                    maxLength={4}
                    placeholder="####"
                    value={ssnLast4}
                    onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {cb(
                tcpa,
                setTcpa,
                "TCPA Consent — client has given express written consent to be contacted, including via automated systems.",
              )}
            </>
          )}

          {/* 3. Employment & Hardship */}
          {step === 2 && (
            <>
              <h3 className="font-semibold">Employment &amp; Hardship</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Employment Status</Label>
                  <Select value={employment} onValueChange={setEmployment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT.map((e) => (
                        <SelectItem key={e} value={e}>
                          {titleCase(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Monthly Income (Approximate)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Primary Reason for Hardship</Label>
                <Select value={hardship} onValueChange={setHardship}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {HARDSHIP.map((h) => (
                      <SelectItem key={h} value={h}>
                        {titleCase(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  rows={3}
                  value={hardshipNotes}
                  onChange={(e) => setHardshipNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {/* 4. Credit Auth */}
          {step === 3 && (
            <>
              <h3 className="font-semibold">Credit Authorization</h3>
              <div className="rounded-md border border-guardian-gold/40 bg-guardian-gold/5 p-3 text-sm">
                <p className="font-medium text-guardian-gold">Verification Script</p>
                <p className="mt-1 italic text-muted-foreground">
                  "I need to verify your identity before we pull your credit. Please state your full
                  legal name and the last 4 digits of your Social Security Number."
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <span className="text-muted-foreground">Name:</span> {firstName} {lastName}
                {"   "}
                <span className="text-muted-foreground">SSN Last 4:</span>{" "}
                {ssnLast4 || "Not provided"}
                {"   "}
                <span className="text-muted-foreground">State:</span> {state || "—"}
              </div>
              {cb(
                creditAuth,
                setCreditAuth,
                "Client has verbally authorized a soft credit pull. (Documented for compliance; does not affect credit score.)",
              )}
            </>
          )}

          {/* 5. Debts */}
          {step === 4 && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Debt Selection</h3>
                <Button size="sm" variant="outline" onClick={addDebt}>
                  + Add Debt
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enrolled Debts: {debts.length} · Total: {formatCurrency(totalDebt)}
              </p>
              {debts.length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No debts added yet. Add debts to calculate program options.
                </p>
              )}
              {debts.map((d, i) => (
                <div key={i} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Debt #{i + 1}</span>
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() => removeDebt(i)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Creditor name"
                      value={d.creditor_name}
                      onChange={(e) => updateDebt(i, { creditor_name: e.target.value })}
                    />
                    <Select
                      value={d.account_type}
                      onValueChange={(v) => updateDebt(i, { account_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEBT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {titleCase(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      type="number"
                      placeholder="Original $"
                      value={d.original_balance}
                      onChange={(e) => updateDebt(i, { original_balance: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Current $ *"
                      value={d.current_balance}
                      onChange={(e) => updateDebt(i, { current_balance: e.target.value })}
                    />
                    <Input
                      maxLength={4}
                      placeholder="Acct #### "
                      value={d.account_number_last4}
                      onChange={(e) =>
                        updateDebt(i, { account_number_last4: e.target.value.replace(/\D/g, "") })
                      }
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* 6. Plan */}
          {step === 5 && (
            <>
              <h3 className="font-semibold">Plan Selection</h3>
              <p className="text-sm text-muted-foreground">
                Based on total enrolled debt of {formatCurrency(totalDebt)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PROGRAM_TERMS.map((t) => {
                  const active = term === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTerm(t)}
                      className={cn(
                        "rounded-md border p-3 text-left",
                        active ? "border-guardian-gold ring-1 ring-guardian-gold" : "border-input",
                      )}
                    >
                      <p className="font-medium">{t} Months</p>
                      <p className="text-sm text-muted-foreground">
                        Monthly Draft{" "}
                        <span className="float-right font-medium text-foreground">
                          {formatCurrency(monthlyDraft(totalDebt, t, plan))}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Cost{" "}
                        <span className="float-right">
                          {formatCurrency(totalProgramCost(totalDebt, t, plan))}
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {PLAN_OPTIONS.map((p) => (
                  <label
                    key={p.type}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm",
                      planType === p.type
                        ? "border-guardian-gold ring-1 ring-guardian-gold"
                        : "border-input",
                    )}
                  >
                    <input
                      type="radio"
                      name="plan"
                      className="mt-1"
                      checked={planType === p.type}
                      onChange={() => setPlanType(p.type)}
                    />
                    <span>
                      <span className="font-medium">{p.label}</span>
                      <span className="block text-muted-foreground">{p.note}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="space-y-1">
                <Label>First Payment Date *</Label>
                <Input
                  type="date"
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* 7. Banking & Disclosures */}
          {step === 6 && (
            <>
              <h3 className="font-semibold">Required Disclosures</h3>
              <p className="text-sm text-muted-foreground">
                The client must acknowledge all disclosures before proceeding. (Banking details are
                optional at this stage.)
              </p>
              <div className="space-y-2">
                {DISCLOSURES.map(([k, label]) =>
                  cb(!!ack[k], (v) => setAck((a) => ({ ...a, [k]: v })), label),
                )}
              </div>
              {!allAck && (
                <p className="text-xs text-guardian-gold">
                  All disclosures must be acknowledged to continue.
                </p>
              )}
            </>
          )}

          {/* 8. Review */}
          {step === 7 && (
            <>
              <h3 className="font-semibold">Review &amp; Submit</h3>
              <div className="space-y-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="font-medium">Client</p>
                  <p className="text-muted-foreground">
                    {firstName} {lastName} · {email || "no email"} · DOB {dob || "—"} · SSN{" "}
                    {ssnLast4 || "—"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="font-medium">Enrolled Debts ({debts.length})</p>
                  <p className="text-muted-foreground">Total {formatCurrency(totalDebt)}</p>
                </div>
                <div className="rounded-md border border-guardian-gold/40 bg-guardian-gold/5 p-3">
                  <p className="font-medium">Selected Plan</p>
                  <p className="text-muted-foreground">
                    {plan.label} · {term} months · Monthly draft{" "}
                    <span className="font-medium text-guardian-gold">{formatCurrency(draft)}</span>{" "}
                    · First payment {firstPaymentDate || "—"} · Fee{" "}
                    {Math.round(plan.feePercentage * 100)}%
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" disabled={!canNext()} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-guardian-gold text-guardian-navy hover:bg-guardian-gold/90"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? "Enrolling…" : "Complete Enrollment"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
