import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Lightbulb, ListChecks, Target, Workflow } from 'lucide-react';
import type { RoleGuide } from '@/lib/docs/roleGuides';

interface RoleGuideDisplayProps {
  guide: RoleGuide;
}

export function RoleGuideDisplay({ guide }: RoleGuideDisplayProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{guide.title}</h1>
        <p className="text-muted-foreground mt-2 text-lg">{guide.introduction}</p>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Getting Started
          </CardTitle>
          <CardDescription>First steps after logging in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {guide.gettingStarted.map((step, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Daily Workflow
          </CardTitle>
          <CardDescription>Typical daily routine and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {guide.dailyWorkflow.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="font-semibold text-sm border-b pb-2">{section.title}</h4>
                <ul className="space-y-2">
                  {section.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Key Features
          </CardTitle>
          <CardDescription>Primary tools and features for your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {guide.keyFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{feature.feature}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                </div>
                <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
                  {feature.location}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Best Practices
          </CardTitle>
          <CardDescription>Tips for success in your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {guide.bestPractices.map((practice, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-sm">{practice}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Tasks */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Common Tasks</h2>
        <div className="space-y-4">
          {guide.commonTasks.map((task, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{task.task}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {task.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                        {stepIdx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
