import { EDGE_FUNCTIONS } from '@/lib/docs/schemaData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Code, Lock } from 'lucide-react';

export default function EdgeFunctionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edge Functions</h1>
        <p className="text-muted-foreground mt-2">
          Serverless backend functions for complex operations and external integrations.
        </p>
      </div>

      <div className="grid gap-4">
        {EDGE_FUNCTIONS.map((func) => (
          <Card key={func.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                <code>{func.name}</code>
              </CardTitle>
              <CardDescription>{func.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Path</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">{func.path}</code>
              </div>

              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Authentication
                </p>
                <p className="text-sm text-muted-foreground">{func.authentication}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Input Parameters</p>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {func.inputs.map((input) => (
                        <TableRow key={input.name}>
                          <TableCell className="font-mono text-sm">{input.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{input.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{input.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Returns</p>
                <p className="text-sm text-muted-foreground">{func.outputs}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {EDGE_FUNCTIONS.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No edge functions are currently deployed.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
