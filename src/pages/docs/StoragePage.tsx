import { STORAGE_BUCKETS } from '@/lib/docs/schemaData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, Globe, Lock } from 'lucide-react';

export default function StoragePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Storage Buckets</h1>
        <p className="text-muted-foreground mt-2">
          File storage buckets for documents, images, and other assets.
        </p>
      </div>

      <div className="grid gap-4">
        {STORAGE_BUCKETS.map((bucket) => (
          <Card key={bucket.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <code>{bucket.name}</code>
                <Badge variant={bucket.isPublic ? "default" : "secondary"} className="text-xs flex items-center gap-1">
                  {bucket.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {bucket.isPublic ? 'Public' : 'Private'}
                </Badge>
              </CardTitle>
              <CardDescription>{bucket.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm font-medium mb-2">Access Policies</p>
                <ul className="space-y-1">
                  {bucket.policies.map((policy, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {policy}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
