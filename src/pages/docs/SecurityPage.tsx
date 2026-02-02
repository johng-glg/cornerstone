import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Lock, Database, Globe, FileCheck } from 'lucide-react';
import { SECURITY_CONCERNS, type SecurityItem } from '@/lib/docs/roadmapData';

const severityConfig = {
  Critical: { color: 'bg-red-600 text-white', icon: AlertTriangle },
  High: { color: 'bg-orange-500 text-white', icon: AlertTriangle },
  Medium: { color: 'bg-yellow-500 text-black', icon: Shield },
  Low: { color: 'bg-blue-500 text-white', icon: Shield },
};

const categoryIcons: Record<string, typeof Shield> = {
  Authentication: Lock,
  'Data Protection': Database,
  Database: Database,
  API: Globe,
  Security: Shield,
  Compliance: FileCheck,
  Integrations: Globe,
};

function SecurityCard({ item }: { item: SecurityItem }) {
  const config = severityConfig[item.severity];
  const CategoryIcon = categoryIcons[item.category] || Shield;
  
  return (
    <Card className={item.severity === 'Critical' ? 'border-red-500/50' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{item.issue}</CardTitle>
              <CardDescription>{item.category}</CardDescription>
            </div>
          </div>
          <Badge className={config.color}>
            {item.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className={
            item.status === 'Open' ? 'border-red-500 text-red-500' :
            item.status === 'In Progress' ? 'border-yellow-500 text-yellow-500' :
            'border-green-500 text-green-500'
          }>
            {item.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SecurityPage() {
  const criticalItems = SECURITY_CONCERNS.filter(i => i.severity === 'Critical');
  const highItems = SECURITY_CONCERNS.filter(i => i.severity === 'High');
  const mediumItems = SECURITY_CONCERNS.filter(i => i.severity === 'Medium');
  const lowItems = SECURITY_CONCERNS.filter(i => i.severity === 'Low');

  const openCount = SECURITY_CONCERNS.filter(i => i.status === 'Open').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Concerns</h1>
        <p className="text-muted-foreground mt-2">
          Security issues to address before production deployment. Items are tracked by severity and status.
        </p>
      </div>

      {/* Warning Banner */}
      <Card className="border-yellow-500/50 bg-yellow-500/10">
        <CardContent className="flex items-center gap-4 p-4">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
              Development Environment
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              These security concerns are documented for addressing before production. 
              Focus on building features during the test data phase.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{SECURITY_CONCERNS.length}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{criticalItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{highItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{openCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues */}
      {criticalItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Critical
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {criticalItems.map(item => (
              <SecurityCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* High Issues */}
      {highItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            High
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {highItems.map(item => (
              <SecurityCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Medium Issues */}
      {mediumItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-yellow-600">
            <Shield className="h-5 w-5" />
            Medium
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mediumItems.map(item => (
              <SecurityCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Low Issues */}
      {lowItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-600">
            <Shield className="h-5 w-5" />
            Low
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {lowItems.map(item => (
              <SecurityCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Pre-Production Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Production Checklist</CardTitle>
          <CardDescription>Complete before going live</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>All Critical and High severity issues resolved</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>Full RLS policy audit completed</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>Penetration testing performed</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>Backup and recovery procedures tested</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>Rate limiting enabled on all endpoints</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>Audit logging enabled</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>SSL/TLS certificates verified</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded" />
              <span>Environment variables secured</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
