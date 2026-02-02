import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Search as SearchIcon, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { INTEGRATIONS, type IntegrationItem } from '@/lib/docs/roadmapData';

const priorityColors = {
  High: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusConfig = {
  Research: { icon: AlertCircle, color: 'text-orange-600' },
  Planned: { icon: Clock, color: 'text-blue-600' },
  'In Progress': { icon: Clock, color: 'text-purple-600' },
  Completed: { icon: CheckCircle, color: 'text-green-600' },
};

function IntegrationCard({ item }: { item: IntegrationItem }) {
  const StatusConfig = statusConfig[item.status];
  
  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{item.name}</CardTitle>
            <CardDescription>{item.purpose}</CardDescription>
          </div>
          <Badge variant="outline" className={priorityColors[item.priority]}>
            {item.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <StatusConfig.icon className={`h-4 w-4 ${StatusConfig.color}`} />
          <span className={StatusConfig.color}>{item.status}</span>
        </div>
        
        <p className="text-sm text-muted-foreground">{item.notes}</p>
        
        {item.apiDocs && (
          <a
            href={item.apiDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            API Documentation
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  
  const filteredIntegrations = INTEGRATIONS.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.purpose.toLowerCase().includes(search.toLowerCase()) ||
    item.notes.toLowerCase().includes(search.toLowerCase())
  );

  const highPriority = filteredIntegrations.filter(i => i.priority === 'High');
  const mediumPriority = filteredIntegrations.filter(i => i.priority === 'Medium');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          External services and APIs to research and integrate. Each integration includes research notes and API documentation links.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search integrations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{INTEGRATIONS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Research Phase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {INTEGRATIONS.filter(i => i.status === 'Research').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {INTEGRATIONS.filter(i => i.status === 'Planned').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {INTEGRATIONS.filter(i => i.status === 'Completed').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Priority */}
      {highPriority.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            High Priority
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {highPriority.map(item => (
              <IntegrationCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Medium Priority */}
      {mediumPriority.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            Medium Priority
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mediumPriority.map(item => (
              <IntegrationCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {filteredIntegrations.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No integrations found matching your search.
        </p>
      )}

      {/* Email Integration Note */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle>Email Integration Strategy</CardTitle>
          <CardDescription>Recommended hybrid approach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">System Emails (Resend/SendGrid)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automated notifications</li>
                <li>• Deadline reminders</li>
                <li>• Password resets</li>
                <li>• High deliverability</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Individual Emails (Google Workspace)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Staff sending to clients</li>
                <li>• Sent from @company.com</li>
                <li>• Personal signatures</li>
                <li>• Tracked in CRM</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
