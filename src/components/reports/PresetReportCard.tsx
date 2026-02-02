import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign, 
  Briefcase,
  BarChart3,
} from 'lucide-react';
import type { ReportTemplate } from '@/types/reports';

interface PresetReportCardProps {
  report: ReportTemplate;
  onRun: (report: ReportTemplate) => void;
}

const REPORT_ICONS: Record<string, React.ElementType> = {
  'Lead Conversion Report': TrendingUp,
  'Enrollment Report': Users,
  'Settlement Report': FileText,
  'Revenue Report': DollarSign,
  'Caseload Report': Briefcase,
};

export function PresetReportCard({ report, onRun }: PresetReportCardProps) {
  const Icon = REPORT_ICONS[report.name] || BarChart3;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{report.name}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {report.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={() => onRun(report)} 
          variant="outline" 
          className="w-full"
        >
          Run Report
        </Button>
      </CardContent>
    </Card>
  );
}
