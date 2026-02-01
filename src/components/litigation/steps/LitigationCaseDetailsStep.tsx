import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, FileText } from 'lucide-react';
import type { LitigationData } from '../LitigationWizard';

interface LitigationCaseDetailsStepProps {
  data: LitigationData;
  updateData: (updates: Partial<LitigationData>) => void;
  setCanProceed: (can: boolean) => void;
}

export function LitigationCaseDetailsStep({
  data,
  updateData,
  setCanProceed,
}: LitigationCaseDetailsStepProps) {
  // Service date is required for response deadline calculation
  useEffect(() => {
    const isValid = !!data.service_date && !!data.opposing_party;
    setCanProceed(isValid);
  }, [data.service_date, data.opposing_party, setCanProceed]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold">Case Details</h3>
        <p className="text-sm text-muted-foreground">
          Enter the lawsuit and court information from the service documents.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="service_date">Service Date *</Label>
          <Input
            id="service_date"
            type="date"
            value={data.service_date || ''}
            onChange={(e) => updateData({ service_date: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Date the client was served with the lawsuit
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="response_deadline">Response Deadline</Label>
          <Input
            id="response_deadline"
            type="date"
            value={data.response_deadline || ''}
            onChange={(e) => updateData({ response_deadline: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Deadline to file response (verify from documents)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="opposing_party">Opposing Party / Plaintiff *</Label>
        <Input
          id="opposing_party"
          placeholder="e.g., Capital One Bank, Midland Funding LLC"
          value={data.opposing_party || ''}
          onChange={(e) => updateData({ opposing_party: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="court_name">Court Name</Label>
          <Input
            id="court_name"
            placeholder="e.g., Harris County District Court"
            value={data.court_name || ''}
            onChange={(e) => updateData({ court_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="case_number">Case Number</Label>
          <Input
            id="case_number"
            placeholder="e.g., 2025-CV-12345"
            value={data.case_number || ''}
            onChange={(e) => updateData({ case_number: e.target.value })}
          />
        </div>
      </div>

      {data.service_date && !data.response_deadline && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <strong>Reminder:</strong> Verify the response deadline from the summons document. 
            Response periods vary by state and court type (typically 14-30 days from service).
          </AlertDescription>
        </Alert>
      )}

      {data.service_date && data.response_deadline && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Days until response deadline:{' '}
            <strong>
              {Math.ceil(
                (new Date(data.response_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )}{' '}
              days
            </strong>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
