/** Shared display formatters. Keep UI components free of ad-hoc Intl instances. */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Whole-dollar currency, e.g. 12345 → "$12,345". Nullish → "—". */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return usd.format(value);
}

/** Short date, e.g. "Jun 1, 2026". Nullish/invalid → "—". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** snake_case / lower → Title Case, e.g. "in_negotiation" → "In Negotiation". */
export function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
