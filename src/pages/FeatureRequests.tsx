import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Lightbulb, AlertTriangle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useFeatureRequests, useUpdateFeatureRequest, type FeatureRequest } from '@/hooks/useFeatureRequests';
import { FeatureRequestDialog } from '@/components/features/FeatureRequestDialog';
import { useAuth } from '@/lib/auth';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  planned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  in_progress: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const TYPE_CONFIG = {
  existing_workflow: { label: 'Existing Workflow', icon: AlertTriangle, color: 'text-amber-600' },
  future_improvement: { label: 'Future Improvement', icon: Lightbulb, color: 'text-blue-600' },
};

function formatLabel(val: string) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function FeatureRequestsPage() {
  const { data: requests, isLoading } = useFeatureRequests();
  const updateMutation = useUpdateFeatureRequest();
  const { isAdmin } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('open');
  const [adminNotes, setAdminNotes] = useState('');

  const filtered = useMemo(() => {
    if (!requests) return [];
    const result = requests.filter(r => {
      const matchesSearch = !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || r.request_type === filterType;
      const matchesStatus =
        filterStatus === 'all' ? true :
        filterStatus === 'open' ? !['completed', 'declined'].includes(r.status) :
        r.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });

    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return result.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));
  }, [requests, searchQuery, filterType, filterStatus]);

  const stats = useMemo(() => {
    if (!requests) return { total: 0, existing: 0, future: 0, open: 0 };
    return {
      total: requests.length,
      existing: requests.filter(r => r.request_type === 'existing_workflow').length,
      future: requests.filter(r => r.request_type === 'future_improvement').length,
      open: requests.filter(r => !['completed', 'declined'].includes(r.status)).length,
    };
  }, [requests]);

  const openDetail = (req: FeatureRequest) => {
    setSelectedRequest(req);
    setAdminNotes(req.admin_notes || '');
  };

  const handleStatusChange = (status: string) => {
    if (!selectedRequest) return;
    updateMutation.mutate({
      id: selectedRequest.id,
      status: status as FeatureRequest['status'],
      admin_notes: adminNotes || null,
    });
    setSelectedRequest({ ...selectedRequest, status: status as FeatureRequest['status'] });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Feature Requests</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Request Backlog</h1>
          <p className="text-muted-foreground">{stats.total} requests · {stats.open} open</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request Feature
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{stats.existing}</span>
            </div>
            <p className="text-sm text-muted-foreground">Workflow Gaps</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.future}</span>
            </div>
            <p className="text-sm text-muted-foreground">Future Improvements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-sm text-muted-foreground">Open Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="existing_workflow">Existing Workflow</SelectItem>
            <SelectItem value="future_improvement">Future Improvement</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => {
                const typeConf = TYPE_CONFIG[req.request_type];
                const TypeIcon = typeConf.icon;
                return (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(req)}
                  >
                    <TableCell>
                      <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.title}</p>
                        {req.affected_module && (
                          <p className="text-xs text-muted-foreground">{req.affected_module}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatLabel(req.category)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>
                        {formatLabel(req.priority)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                        {formatLabel(req.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{req.staff_name || 'Unknown'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No feature requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FeatureRequestDialog open={showDialog} onOpenChange={setShowDialog} />

      {/* Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedRequest.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-6">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedRequest.status]}`}>
                    {formatLabel(selectedRequest.status)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[selectedRequest.priority]}`}>
                    {formatLabel(selectedRequest.priority)}
                  </span>
                  <Badge variant="outline">{formatLabel(selectedRequest.request_type)}</Badge>
                  <Badge variant="outline">{formatLabel(selectedRequest.category)}</Badge>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Submitted by</p>
                    <p className="font-medium">{selectedRequest.staff_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-medium capitalize">{selectedRequest.department?.replace('_', ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Module</p>
                    <p className="font-medium">{selectedRequest.affected_module || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(selectedRequest.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {isAdmin() && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-medium">Admin Actions</p>
                    <Select value={selectedRequest.status} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Admin notes..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({
                        id: selectedRequest.id,
                        admin_notes: adminNotes || null,
                      })}
                      disabled={updateMutation.isPending}
                    >
                      Save Notes
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
