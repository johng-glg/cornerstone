import { ENUM_DEFINITIONS } from '@/lib/docs/schemaData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function EnumsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enums & Types</h1>
        <p className="text-muted-foreground mt-2">
          Custom database enumeration types used throughout the system.
        </p>
      </div>

      <div className="grid gap-4">
        {ENUM_DEFINITIONS.map((enumDef) => (
          <Card key={enumDef.name}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <code className="text-primary">{enumDef.name}</code>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{enumDef.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {enumDef.values.map((value) => (
                  <Badge key={value} variant="secondary" className="font-mono text-xs">
                    {value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
