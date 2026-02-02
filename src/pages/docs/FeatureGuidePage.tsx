import { useParams } from 'react-router-dom';
import { getGuideById } from '@/lib/docs/featureGuides';
import { FeatureGuideDisplay } from '@/components/docs/FeatureGuideDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function FeatureGuidePage() {
  const { feature } = useParams<{ feature: string }>();
  const guide = feature ? getGuideById(feature) : undefined;

  if (!guide) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Feature guide not found for "{feature}".
        </AlertDescription>
      </Alert>
    );
  }

  return <FeatureGuideDisplay guide={guide} />;
}
