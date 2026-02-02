import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Globe, Phone, Users, Share2, Megaphone, Building2 } from 'lucide-react';
import type { LeadSourceMetric } from '@/hooks/useLeadMetrics';

const sourceIcons: Record<string, React.ReactNode> = {
  web_form: <Globe className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  referral: <Users className="h-4 w-4" />,
  social_media: <Share2 className="h-4 w-4" />,
  marketing: <Megaphone className="h-4 w-4" />,
  partner: <Building2 className="h-4 w-4" />,
};

const sourceLabels: Record<string, string> = {
  web_form: 'Web Form',
  phone: 'Phone',
  referral: 'Referral',
  social_media: 'Social Media',
  marketing: 'Marketing',
  partner: 'Partner',
};

interface LeadSourceMetricsCardProps {
  metric: LeadSourceMetric;
}

export function LeadSourceMetricsCard({ metric }: LeadSourceMetricsCardProps) {
  const formatPercent = (ratio: number | null) => {
    if (ratio === null || isNaN(ratio)) return '0%';
    return `${Math.round(ratio * 100)}%`;
  };

  const getProgressValue = (ratio: number | null) => {
    if (ratio === null || isNaN(ratio)) return 0;
    return Math.round(ratio * 100);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {sourceIcons[metric.source] || <Globe className="h-4 w-4" />}
          {sourceLabels[metric.source] || metric.source}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {metric.total_leads} total leads
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Contact Rate</span>
            <span className="font-medium">{formatPercent(metric.contact_ratio)}</span>
          </div>
          <Progress value={getProgressValue(metric.contact_ratio)} className="h-2" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Credit Pull</span>
            <span className="font-medium">{formatPercent(metric.credit_pull_ratio)}</span>
          </div>
          <Progress value={getProgressValue(metric.credit_pull_ratio)} className="h-2" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Qualification</span>
            <span className="font-medium">{formatPercent(metric.qualification_ratio)}</span>
          </div>
          <Progress value={getProgressValue(metric.qualification_ratio)} className="h-2" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Conversion</span>
            <span className="font-medium">{formatPercent(metric.conversion_ratio)}</span>
          </div>
          <Progress value={getProgressValue(metric.conversion_ratio)} className="h-2" />
        </div>

        <div className="pt-2 border-t grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold text-green-600">{metric.converted_count}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-600">{metric.lost_count}</p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
