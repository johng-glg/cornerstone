import { useParams } from 'react-router-dom';
import { getRoleGuide } from '@/lib/docs/roleGuides';
import { RoleGuideDisplay } from '@/components/docs/RoleGuideDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function RoleGuidePage() {
  const { role } = useParams<{ role: string }>();
  const guide = role ? getRoleGuide(role) : undefined;

  if (!guide) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Role guide not found for "{role}".
        </AlertDescription>
      </Alert>
    );
  }

  return <RoleGuideDisplay guide={guide} />;
}
