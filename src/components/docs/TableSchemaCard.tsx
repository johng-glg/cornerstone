import { useState } from 'react';
import { ChevronDown, ChevronUp, Key, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TableSchema } from '@/lib/docs/schemaData';

interface TableSchemaCardProps {
  schema: TableSchema;
}

export function TableSchemaCard({ schema }: TableSchemaCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <code className="text-primary">{schema.name}</code>
                <Badge variant="outline" className="text-xs">
                  {schema.columns.length} columns
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">{schema.description}</CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Columns Table */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Columns</h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Column</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="w-[80px]">Nullable</TableHead>
                      <TableHead className="w-[150px]">Default</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schema.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            {col.name === 'id' && <Key className="h-3 w-3 text-yellow-500" />}
                            {col.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{col.type}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={col.nullable ? "secondary" : "default"} className="text-xs">
                            {col.nullable ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {col.default ? (
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{col.default}</code>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{col.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Relationships */}
            {schema.relationships.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Foreign Keys
                </h4>
                <div className="flex flex-wrap gap-2">
                  {schema.relationships.map((rel, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono text-xs">
                      {rel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* RLS Policies */}
            {schema.rlsPolicies.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">RLS Policies</h4>
                <ul className="space-y-1">
                  {schema.rlsPolicies.map((policy, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                      {policy}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
