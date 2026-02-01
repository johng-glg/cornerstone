import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LitigationData } from '../LitigationWizard';

interface LitigationDocumentsStepProps {
  data: LitigationData;
  updateData: (updates: Partial<LitigationData>) => void;
  setCanProceed: (can: boolean) => void;
}

export function LitigationDocumentsStep({
  data,
  updateData,
  setCanProceed,
}: LitigationDocumentsStepProps) {
  // At minimum, need to confirm documents are received
  useEffect(() => {
    const isValid = data.complaint_uploaded || data.summons_uploaded;
    setCanProceed(isValid);
  }, [data.complaint_uploaded, data.summons_uploaded, setCanProceed]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold">Documents</h3>
        <p className="text-sm text-muted-foreground">
          Confirm receipt of litigation documents. (Upload functionality coming soon)
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Complaint / Petition</CardTitle>
                <CardDescription>The lawsuit document filed against the client</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Checkbox
                id="complaint_received"
                checked={data.complaint_uploaded || false}
                onCheckedChange={(checked) => updateData({ complaint_uploaded: !!checked })}
              />
              <Label htmlFor="complaint_received" className="font-normal cursor-pointer">
                Complaint document received
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Summons</CardTitle>
                <CardDescription>The official summons with court and deadline information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Checkbox
                id="summons_received"
                checked={data.summons_uploaded || false}
                onCheckedChange={(checked) => updateData({ summons_uploaded: !!checked })}
              />
              <Label htmlFor="summons_received" className="font-normal cursor-pointer">
                Summons document received
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {!data.complaint_uploaded && !data.summons_uploaded && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please confirm at least one document has been received to proceed.
          </AlertDescription>
        </Alert>
      )}

      <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Document upload functionality coming soon.
          <br />
          For now, please confirm document receipt above.
        </p>
      </div>
    </div>
  );
}
