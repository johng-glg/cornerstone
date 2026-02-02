import { DATABASE_FUNCTIONS } from '@/lib/docs/schemaData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export default function FunctionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Functions</h1>
        <p className="text-muted-foreground mt-2">
          PostgreSQL functions used for business logic and security.
        </p>
      </div>

      <div className="grid gap-4">
        {DATABASE_FUNCTIONS.map((func) => (
          <Card key={func.name}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <code className="text-primary">{func.name}</code>
                {func.securityDefiner && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    SECURITY DEFINER
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Signature</p>
                <code className="text-sm bg-muted px-2 py-1 rounded block">
                  {func.signature}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">{func.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
