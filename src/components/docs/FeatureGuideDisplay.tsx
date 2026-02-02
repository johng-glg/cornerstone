import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import type { FeatureGuide } from '@/lib/docs/featureGuides';

interface FeatureGuideDisplayProps {
  guide: FeatureGuide;
}

const categoryColors: Record<string, string> = {
  core: 'bg-blue-500',
  workflow: 'bg-green-500',
  admin: 'bg-purple-500',
  reporting: 'bg-orange-500',
};

export function FeatureGuideDisplay({ guide }: FeatureGuideDisplayProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{guide.title}</h1>
          <Badge className={categoryColors[guide.category] || 'bg-gray-500'}>
            {guide.category}
          </Badge>
        </div>
        <p className="text-muted-foreground text-lg">{guide.description}</p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {guide.sections.map((section, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main content */}
              <p className="text-muted-foreground">{section.content}</p>

              {/* Steps */}
              {section.steps && section.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Steps
                  </h4>
                  <ol className="space-y-2 ml-6">
                    {section.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                          {stepIdx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tips */}
              {section.tips && section.tips.length > 0 && (
                <Alert className="bg-yellow-500/10 border-yellow-500/30">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {section.tips.map((tip, tipIdx) => (
                        <p key={tipIdx} className="text-sm">{tip}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {section.warnings && section.warnings.length > 0 && (
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {section.warnings.map((warning, warnIdx) => (
                        <p key={warnIdx} className="text-sm">{warning}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
