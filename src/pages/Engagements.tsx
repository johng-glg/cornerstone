import { useState } from 'react';
import { Plus, Search, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEngagements, type Engagement, type EngagementStatus } from '@/hooks/useEngagements';
import { EngagementFormDialog } from '@/components/engagements/EngagementFormDialog';
import { EngagementDetailSheet } from '@/components/engagements/EngagementDetailSheet';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: 'Prospect', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  suspended: { label: 'Suspended', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
};

export default function EngagementsPage() {
  const [statusFilter, setStatusFilter] = useState<EngagementStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);

  const { data: engagements, isLoading } = useEngagements(
    statusFilter === 'all' ? undefined : statusFilter
  );

  const handleViewEngagement = (engagement: Engagement) => {
    setSelectedEngagementId(engagement.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Engagements</h1>
          <p className="text-muted-foreground">Manage client engagements and services</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Engagement
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EngagementStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Engagements Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Engagement #</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : engagements && engagements.length > 0 ? (
              engagements.map((engagement) => (
                <TableRow
                  key={engagement.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewEngagement(engagement)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{engagement.engagement_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {engagement.primary_contact ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">
                          {engagement.primary_contact.first_name} {engagement.primary_contact.last_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No contact</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[engagement.status]?.className}>
                      {statusConfig[engagement.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {engagement.engagement_services && engagement.engagement_services.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {engagement.engagement_services.slice(0, 2).map((es) => (
                          <Badge key={es.id} variant="outline" className="text-xs">
                            {es.service?.name}
                          </Badge>
                        ))}
                        {engagement.engagement_services.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{engagement.engagement_services.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(engagement.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No engagements found. Create your first engagement!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <EngagementFormDialog
        open={showForm}
        onOpenChange={setShowForm}
      />

      {/* Detail Sheet */}
      <EngagementDetailSheet
        engagementId={selectedEngagementId}
        open={!!selectedEngagementId}
        onOpenChange={(open) => !open && setSelectedEngagementId(null)}
      />
    </div>
  );
}
