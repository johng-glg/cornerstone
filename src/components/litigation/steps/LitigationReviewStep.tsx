import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle2, User, FileText, Calendar, Building2, Scale } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { LitigationData } from '../LitigationWizard';
import { format } from 'date-fns';
import { useState } from 'react';

interface LitigationReviewStepProps {
  lead: Tables<'leads'> | null | undefined;
  data: LitigationData;
  setCanProceed: (can: boolean) => void;
}

export function LitigationReviewStep({
  lead,
  data,
  setCanProceed,
}: LitigationReviewStepProps) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setCanProceed(confirmed);
  }, [confirmed, setCanProceed]);

  if (!lead) return null;

  const daysUntilDeadline = data.response_deadline
    ? Math.ceil((new Date(data.response_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold">Review & Confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review the case information before converting to a litigation file.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{lead.first_name} {lead.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">State</span>
              <span>{data.state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{lead.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{lead.email || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Case Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Debt Amount</span>
              <span className="font-medium">${data.debt_amount?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Case Type</span>
              <Badge variant="outline">Debt Defense</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opposing Party</span>
              <span>{data.opposing_party || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Case Number</span>
              <span>{data.case_number || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Court</span>
              <span>{data.court_name || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Date</span>
              <span>{data.service_date ? format(new Date(data.service_date), 'MMM d, yyyy') : '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Response Deadline</span>
              <div className="flex items-center gap-2">
                {data.response_deadline ? (
                  <>
                    <span>{format(new Date(data.response_deadline), 'MMM d, yyyy')}</span>
                    <Badge variant={daysUntilDeadline && daysUntilDeadline <= 7 ? 'destructive' : 'secondary'}>
                      {daysUntilDeadline} days
                    </Badge>
                  </>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Complaint</span>
              {data.complaint_uploaded ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Received
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Summons</span>
              {data.summons_uploaded ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Received
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
        <Checkbox
          id="confirm"
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(!!checked)}
        />
        <Label htmlFor="confirm" className="font-normal cursor-pointer text-sm leading-relaxed">
          I confirm that all information has been verified with the client and this lead 
          is ready to be converted to an active litigation case.
        </Label>
      </div>
    </div>
  );
}
