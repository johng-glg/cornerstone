import { useState, useEffect } from 'react';
import { useLeads, useLead } from '@/hooks/useLeads';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { LeadKanban } from '@/components/leads/LeadKanban';
import { LeadFormDialog } from '@/components/leads/LeadFormDialog';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { LeadScoreBadge } from '@/components/leads/LeadScoreBadge';
import { EnrollmentWizard } from '@/components/enrollment/EnrollmentWizard';
import { LitigationWizard } from '@/components/litigation/LitigationWizard';
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Plus, Search, LayoutGrid, List, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/hooks/useLeads';

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [convertingLitigationLeadId, setConvertingLitigationLeadId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Handle ?action=new query param to auto-open dialog
  // Handle ?open=id query param to auto-open detail sheet
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowCreateDialog(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
    const openId = searchParams.get('open');
    if (openId) {
      setSelectedLeadId(openId);
      searchParams.delete('open');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Enable realtime updates for leads
  useRealtimeLeads({ enabled: true, showToasts: true });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // For list view, use pagination. For Kanban, fetch all (no pagination)
  const { data: result, isLoading } = useLeads(
    view === 'list'
      ? {
          status: statusFilter === 'all' ? undefined : (statusFilter as LeadStatus),
          page,
          pageSize,
        }
      : {
          // Kanban: no pagination, get all leads
        }
  );

  const { data: selectedLead } = useLead(selectedLeadId ?? undefined);

  const leads = result?.data;
  const totalCount = result?.count ?? 0;

  const handleConvert = (leadId: string) => {
    // Find the lead to determine which wizard to use
    const lead = leads?.find(l => l.id === leadId);
    if (!lead) return;
    
    if (lead.interest_type === 'litigation') {
      setConvertingLitigationLeadId(leadId);
    } else {
      setConvertingLeadId(leadId);
    }
  };

  // Client-side filtering for list view (search is not server-side yet)
  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      searchQuery === '' ||
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.lead_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const statusColors = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    qualified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    converted: 'bg-primary/20 text-primary',
    lost: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-heading font-bold tracking-tight">LEADS</h1>
          <p className="text-muted-foreground">
            Manage your sales pipeline and convert leads to engagements
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
          <TabsList>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <LeadKanban onLeadClick={setSelectedLeadId} />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Est. Debt</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredLeads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads?.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{lead.lead_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <LeadScoreBadge 
                        score={lead.lead_score ?? 0}
                        breakdown={lead.score_breakdown_typed}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(statusColors[lead.status])}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">
                        {lead.interest_type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lead.estimated_debt_amount
                        ? `$${lead.estimated_debt_amount.toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {lead.assigned_staff ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={lead.assigned_staff.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {lead.assigned_staff.first_name[0]}
                              {lead.assigned_staff.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {lead.assigned_staff.first_name} {lead.assigned_staff.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination - only for list view */}
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Dialogs */}
      <LeadFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <LeadDetailSheet
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onConvert={(id) => {
          setSelectedLeadId(null);
          handleConvert(id);
        }}
      />

      <EnrollmentWizard
        leadId={convertingLeadId}
        onClose={() => setConvertingLeadId(null)}
        onSuccess={() => setConvertingLeadId(null)}
      />

      <LitigationWizard
        leadId={convertingLitigationLeadId}
        onClose={() => setConvertingLitigationLeadId(null)}
        onSuccess={() => setConvertingLitigationLeadId(null)}
      />
    </div>
  );
}
