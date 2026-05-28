import { useEffect, useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, AlertCircle, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateDocumentUpload, DOCUMENT_ACCEPT_ATTR } from '@/lib/storage';
import { SignedDocumentLink } from '@/components/storage/SignedDocumentLink';
import { useCurrentStaff } from '@/hooks/useStaff';
import type { LitigationData } from '../LitigationWizard';

interface LitigationDocumentsStepProps {
  data: LitigationData;
  updateData: (updates: Partial<LitigationData>) => void;
  setCanProceed: (can: boolean) => void;
}

interface DocumentUploadProps {
  label: string;
  description: string;
  isUploaded: boolean;
  onUploadChange: (uploaded: boolean, url?: string) => void;
  uploadedUrl?: string;
  tempFolderId: string;
  companyId: string | undefined;
  documentType: 'complaint' | 'summons';
}


function DocumentUploadCard({
  label,
  description,
  isUploaded,
  onUploadChange,
  uploadedUrl,
  tempFolderId,
  companyId,
  documentType,
}: DocumentUploadProps) {

  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateDocumentUpload(file);
    if (err) {
      toast({ title: 'File rejected', description: err.message, variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      if (!companyId) {
        throw new Error('Company context missing; please reload.');
      }
      const fileExt = file.name.split('.').pop();
      const filePath = `${companyId}/temp/${tempFolderId}/${documentType}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('litigation-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Phase 7: bucket is private — persist the bucket-relative path; viewers resolve signed URLs.
      onUploadChange(true, data.path);
      toast({ title: 'File uploaded successfully' });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onUploadChange(false, undefined);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (!checked) {
      handleRemove();
    } else {
      onUploadChange(true, uploadedUrl);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id={`${documentType}_received`}
            checked={isUploaded}
            onCheckedChange={handleCheckboxChange}
          />
          <Label htmlFor={`${documentType}_received`} className="font-normal cursor-pointer">
            Document received
          </Label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={DOCUMENT_ACCEPT_ATTR}
        />

        {uploadedUrl ? (
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {fileName || 'Uploaded document'}
              </p>
              <SignedDocumentLink
                bucket="litigation-documents"
                urlOrPath={uploadedUrl}
                className="text-xs text-primary hover:underline truncate block"
              >
                View file
              </SignedDocumentLink>

            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {label}
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          PDF, Office docs, images, .eml/.msg (max 25 MB)
        </p>
      </CardContent>
    </Card>
  );
}

export function LitigationDocumentsStep({
  data,
  updateData,
  setCanProceed,
}: LitigationDocumentsStepProps) {
  // Generate a temp folder ID if we don't have one
  const tempFolderId = data.lead_id || `temp-${Date.now()}`;
  const { data: currentStaff } = useCurrentStaff();
  const companyId = currentStaff?.company_id;

  useEffect(() => {
    const isValid = data.complaint_uploaded || data.summons_uploaded;
    setCanProceed(isValid);
  }, [data.complaint_uploaded, data.summons_uploaded, setCanProceed]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold">Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload or confirm receipt of litigation documents.
        </p>
      </div>

      <div className="grid gap-4">
        <DocumentUploadCard
          label="Complaint / Petition"
          description="The lawsuit document filed against the client"
          isUploaded={data.complaint_uploaded || false}
          uploadedUrl={data.complaint_url}
          onUploadChange={(uploaded, url) => {
            updateData({
              complaint_uploaded: uploaded,
              complaint_url: url,
            });
          }}
          tempFolderId={tempFolderId}
          companyId={companyId}
          documentType="complaint"
        />

        <DocumentUploadCard
          label="Summons"
          description="The official summons with court and deadline information"
          isUploaded={data.summons_uploaded || false}
          uploadedUrl={data.summons_url}
          onUploadChange={(uploaded, url) => {
            updateData({
              summons_uploaded: uploaded,
              summons_url: url,
            });
          }}
          tempFolderId={tempFolderId}
          companyId={companyId}
          documentType="summons"
        />
      </div>


      {!data.complaint_uploaded && !data.summons_uploaded && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please confirm at least one document has been received to proceed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
