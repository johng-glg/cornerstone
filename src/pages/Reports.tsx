import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REPORTS = [
  "Enrollment funnel",
  "Settlement performance",
  "Payment / NSF summary",
  "Litigation status",
  "Staff productivity",
  "Revenue & billing",
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Standard operational reports.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{r}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Report builder coming soon.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
