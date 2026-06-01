import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DOCS = [
  ["Getting started", "Logging in, navigation, and the role lens."],
  ["Leads & enrollment", "Capturing leads, scoring, and the 8-step Consumer Defense enrollment."],
  ["Clients & engagements", "Client workspace, engagements, liabilities, and payments."],
  ["Litigation", "Matters, hearings, and filings."],
  ["Billing & payments", "Time/expense entries and PLSA transactions."],
  ["Admin", "Companies, staff, creditors, and integrations."],
];

export default function Documentation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documentation</h1>
        <p className="text-sm text-muted-foreground">Guides for using Cornerstone.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {DOCS.map(([t, d]) => (
          <Card key={t}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{d}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
