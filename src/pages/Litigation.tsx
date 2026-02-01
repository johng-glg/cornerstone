import { useState, useMemo } from 'react';
import { format, isPast } from 'date-fns';
import { Plus, Scale, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLitigationMatters, type LitigationStatus } from '@/hooks/useLitigationMatters';
import { LitigationMatterDetailSheet } from '@/components/litigation/LitigationMatterDetailSheet';
import { LitigationMatterFormDialog } from '@/components/litigation/LitigationMatterFormDialog';

const statusBadgeColors: Record<LitigationStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  pre_response: 'bg-red-100 text-red-800',
  post_response: 'bg-yellow-100 text-yellow-800',
  settled: 'bg-green-100 text-green-800',
  dropped: 'bg-gray-100 text-gray-500',
  judgment: 'bg-red-100 text-red-800',
  declined: 'bg-orange-100 text-orange-800',
  dismissed: 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<LitigationStatus, string> = {
  new: 'New',
  pre_response: 'Pre-Response',
  post_response: 'Post-Response',
  settled: 'Settled',
  dropped: 'Dropped',
  judgment: 'Judgment',
  declined: 'Declined',
  dismissed: 'Dismissed',
};

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export default function LitigationPage() {
  const { data: matters, isLoading } = useLitigationMatters();
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMatters = useMemo(() => {
    if (!matters) return [];
    
    return matters.filter(matter => {
      // Status filter
      if (statusFilter !== 'all' && matter.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const clientName = matter.client_service?.primary_client 
          ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`.toLowerCase()
          : '';
        const caseNumber = (matter.case_number || '').toLowerCase();
        const opposingParty = (matter.opposing_party || '').toLowerCase();
        const courtName = (matter.court_name || '').toLowerCase();
        
        return clientName.includes(query) || 
               caseNumber.includes(query) || 
               opposingParty.includes(query) ||
               courtName.includes(query);
      }
      
      return true;
    });
  }, [matters, searchQuery, statusFilter]);

  // Count by status for quick filters
  const statusCounts = useMemo(() => {
    if (!matters) return {};
    const counts: Record<string, number> = { all: matters.length };
    matters.forEach(m => {
      counts[m.status] = (counts[m.status] || 0) + 1;
    });
    return counts;
  }, [matters]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Litigation</h1>
            <p className="text-sm text-muted-foreground">
              {matters?.length || 0} total matters
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case #, opposing party, court..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({statusCounts.all || 0})</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label} ({statusCounts[value] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{statusCounts.pre_response || 0}</p>
            <p className="text-sm text-muted-foreground">Pre-Response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{statusCounts.post_response || 0}</p>
            <p className="text-sm text-muted-foreground">Post-Response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{statusCounts.settled || 0}</p>
            <p className="text-sm text-muted-foreground">Settled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{statusCounts.judgment || 0}</p>
            <p className="text-sm text-muted-foreground">Judgment</p>
          </CardContent>
        </Card>
      </div>

      {/* Matters Table */}
      {filteredMatters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No litigation matters found</p>
            <p className="text-sm">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Litigation matters will appear here when created from liabilities'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead>Opposing Party</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Deadline</TableHead>
                <TableHead>Next Hearing</TableHead>
                <TableHead className="text-right">Judgment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatters.map((matter) => {
                const isOverdue = matter.response_deadline && 
                  isPast(new Date(matter.response_deadline)) && 
                  matter.status === 'pre_response';
                
                return (
                  <TableRow 
                    key={matter.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedMatterId(matter.id)}
                  >
                    <TableCell className="font-medium">
                      {matter.case_number || '—'}
                    </TableCell>
                    <TableCell>{matter.opposing_party || '—'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{matter.court_name || '—'}</p>
                        {matter.county && matter.state && (
                          <p className="text-xs text-muted-foreground">
                            {matter.county}, {matter.state}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeColors[matter.status]}>
                        {statusLabels[matter.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {matter.response_deadline ? (
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(matter.response_deadline), 'MMM d, yyyy')}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {matter.next_hearing_date 
                        ? format(new Date(matter.next_hearing_date), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(matter.judgment_amount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail Sheet */}
      <LitigationMatterDetailSheet
        matterId={selectedMatterId}
        open={!!selectedMatterId}
        onOpenChange={(open) => !open && setSelectedMatterId(null)}
      />
    </div>
  );
}
