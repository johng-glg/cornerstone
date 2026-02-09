import { useState } from 'react';
import { format, isPast } from 'date-fns';
import { Link } from 'react-router-dom';
import { Scale, Building2, Calendar, User, Edit, Plus, DollarSign, CheckSquare, Phone, Mail, ExternalLink, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { useLitigationMatter, useLitigationMatters, type LitigationStatus, type LitigationMatter, useUpdateLitigationMatter } from '@/hooks/useLitigationMatters';
import { useLitigationHearings, useDeleteLitigationHearing, type LitigationHearing } from '@/hooks/useLitigationHearings';
import { useDeleteLitigationDocument } from '@/hooks/useLitigationDocuments';
import { useCurrentStaff } from '@/hooks/useStaff';
import { LitigationMatterFormDialog } from './LitigationMatterFormDialog';
import { LitigationActivityTimeline } from './LitigationActivityTimeline';
import { LitigationHearingCard } from './LitigationHearingCard';
import { LitigationDocumentList } from './LitigationDocumentList';
import { MatterTeamPanel } from './MatterTeamPanel';
import { MatterTasksList } from './MatterTasksList';
import { LitigationHearingFormDialog } from './LitigationHearingFormDialog';
import { LitigationDocumentFormDialog } from './LitigationDocumentFormDialog';
import { LitigationActivityFormDialog } from './LitigationActivityFormDialog';
import { MatterAssignmentDialog } from './MatterAssignmentDialog';
import { MatterBillingPanel } from './MatterBillingPanel';
import { FilingFeesList } from './FilingFeesList';
import { AppearanceRequestsList } from './AppearanceRequestsList';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LitigationMatterDetailSheetProps {
  matterId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function LitigationMatterDetailSheet({ matterId, open, onOpenChange }: LitigationMatterDetailSheetProps) {
  const { data: matter, isLoading } = useLitigationMatter(matterId || undefined);
  const { data: allMatters } = useLitigationMatters(matter?.client_service_id || undefined);
  const { data: hearings } = useLitigationHearings(matterId || undefined);
  const { data: currentStaff } = useCurrentStaff();
  const updateMatter = useUpdateLitigationMatter();
  const deleteHearing = useDeleteLitigationHearing();
  const deleteDocument = useDeleteLitigationDocument();

  // Sibling matters: other active matters for the same client service
  const siblingMatters = allMatters?.filter(
    m => m.id !== matterId && !['settled', 'dismissed', 'dropped', 'judgment'].includes(m.status)
  ) ?? [];

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [hearingDialogOpen, setHearingDialogOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<LitigationHearing | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const handleStatusChange = (newStatus: LitigationStatus) => {
    if (matter) {
      updateMatter.mutate({ id: matter.id, status: newStatus, staffId: currentStaff?.id });
    }
  };

  const handleEditHearing = (hearing: LitigationHearing) => {
    setEditingHearing(hearing);
    setHearingDialogOpen(true);
  };

  const handleDeleteHearing = (hearingId: string) => {
    if (matterId) {
      deleteHearing.mutate({ id: hearingId, matterId });
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (matterId) {
      deleteDocument.mutate({ id: docId, matterId });
    }
  };


  if (!matterId) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : matter ? (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl flex items-center gap-2">
                      <Scale className="h-5 w-5" />
                      {matter.case_number || 'Case # Pending'}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={statusBadgeColors[matter.status]}>
                        {statusLabels[matter.status]}
                      </Badge>
                      {matter.liability?.current_creditor?.name && (
                        <Badge variant="outline">
                          <Building2 className="h-3 w-3 mr-1" />
                          {matter.liability.current_creditor.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="docs">Docs</TabsTrigger>
                  <TabsTrigger value="fees">Fees</TabsTrigger>
                  <TabsTrigger value="appearances">Appearances</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {/* Client Info Card */}
                  {matter.client_service?.primary_client && (
                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <User className="h-4 w-4" />
                          Client Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Client</p>
                            <Link
                              to={`/clients/${matter.client_service.primary_client.id}`}
                              className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                              onClick={() => onOpenChange(false)}
                            >
                              {matter.client_service.primary_client.first_name} {matter.client_service.primary_client.last_name}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Service #</p>
                            <p className="font-medium">{matter.client_service.service_number}</p>
                          </div>
                          {(matter.client_service.primary_client as any)?.email && (
                            <div>
                              <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                              <p className="font-medium">{(matter.client_service.primary_client as any).email}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Status Change */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Select value={matter.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Case Information */}
                  <Card>
                    <CardContent className="pt-4 grid gap-4">
                      <h4 className="font-medium">Case Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Court</p>
                          <p className="font-medium">{matter.court_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">County/State</p>
                          <p className="font-medium">
                            {[matter.county, matter.state].filter(Boolean).join(', ') || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Opposing Party</p>
                          <p className="font-medium">{matter.opposing_party || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Opposing Counsel</p>
                          <p className="font-medium">{matter.opposing_counsel || '—'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Dates */}
                  <Card>
                    <CardContent className="pt-4 grid gap-4">
                      <h4 className="font-medium">Key Dates</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Service Date</p>
                          <p className="font-medium">
                            {matter.service_date 
                              ? format(new Date(matter.service_date), 'MMM d, yyyy') 
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Response Deadline</p>
                          <p className={`font-medium ${matter.response_deadline && isPast(new Date(matter.response_deadline)) ? 'text-red-600' : ''}`}>
                            {matter.response_deadline 
                              ? format(new Date(matter.response_deadline), 'MMM d, yyyy') 
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Next Hearing</p>
                          <p className="font-medium">
                            {matter.next_hearing_date 
                              ? format(new Date(matter.next_hearing_date), 'MMM d, yyyy h:mm a') 
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <Card>
                    <CardContent className="pt-4 grid gap-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Financial Summary
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current Balance</p>
                          <p className="font-medium">{formatCurrency(matter.liability?.current_balance)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Judgment Amount</p>
                          <p className="font-medium">{formatCurrency(matter.judgment_amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Settlement Amount</p>
                          <p className="font-medium">{formatCurrency(matter.settlement_amount)}</p>
                        </div>
                      </div>
                    </CardContent>
                   </Card>

                  {/* Other Active Matters */}
                  {siblingMatters.length > 0 && (
                    <Card className="border-amber-200">
                      <CardContent className="pt-4 space-y-3">
                        <h4 className="font-medium flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          Other Active Matters ({siblingMatters.length})
                        </h4>
                        <div className="space-y-2">
                          {siblingMatters.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted"
                              onClick={() => {
                                // Close and reopen with new matter
                                onOpenChange(false);
                                setTimeout(() => {
                                  window.location.href = `/litigation?open=${m.id}`;
                                }, 200);
                              }}
                            >
                              <div>
                                <p className="text-sm font-medium">{m.case_number || 'No case #'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {m.liability?.current_creditor?.name || m.opposing_party || '—'} · {formatCurrency(m.liability?.current_balance)}
                                </p>
                              </div>
                              <Badge className={statusBadgeColors[m.status]}>
                                {statusLabels[m.status]}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <NotesPanel entityType="litigation_matter" entityId={matterId!} />
                  
                  {/* Legacy notes */}
                  {matter.notes && (
                    <Card className="mt-4">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground mb-1">Legacy Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{matter.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="team" className="mt-4">
                  <MatterTeamPanel 
                    matterId={matterId} 
                    onAddAssignment={() => setAssignmentDialogOpen(true)}
                    opposingCounsel={{
                      lawFirmName: (matter as any).opposing_creditor?.name,
                      contactName: (matter as any).opposing_contact 
                        ? `${(matter as any).opposing_contact.first_name} ${(matter as any).opposing_contact.last_name}`
                        : null,
                      contactTitle: (matter as any).opposing_contact?.title,
                      contactEmail: (matter as any).opposing_contact?.email,
                      contactPhone: (matter as any).opposing_contact?.phone,
                    }}
                  />
                </TabsContent>

                <TabsContent value="events" className="mt-4 space-y-6">
                  {/* Hearings Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Hearings
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setEditingHearing(null);
                          setHearingDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                    </div>
                    
                    {hearings && hearings.length > 0 ? (
                      <div className="space-y-3">
                        {hearings.map((hearing) => (
                          <LitigationHearingCard
                            key={hearing.id}
                            hearing={hearing}
                            onEdit={handleEditHearing}
                            onDelete={handleDeleteHearing}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                        <Calendar className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hearings scheduled</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Tasks Section */}
                  <MatterTasksList 
                    matterId={matterId} 
                    onAddTask={() => setTaskDialogOpen(true)}
                  />
                </TabsContent>

                <TabsContent value="docs" className="mt-4">
                  <LitigationDocumentList 
                    matterId={matterId}
                    onAddDocument={() => setDocumentDialogOpen(true)}
                    onDeleteDocument={handleDeleteDocument}
                  />
                </TabsContent>

                <TabsContent value="fees" className="mt-4">
                  <FilingFeesList matterId={matterId!} />
                </TabsContent>

                <TabsContent value="appearances" className="mt-4">
                  <AppearanceRequestsList matterId={matterId!} />
                </TabsContent>

                <TabsContent value="billing" className="mt-4">
                  <MatterBillingPanel matterId={matterId!} />
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <LitigationActivityTimeline 
                    matterId={matterId}
                    onAddActivity={() => setActivityDialogOpen(true)}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Matter not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      {matter && (
        <>
          <LitigationMatterFormDialog
            liabilityId={matter.liability_id}
            clientServiceId={matter.client_service_id}
            matter={matter}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />

          <LitigationHearingFormDialog
            matterId={matterId!}
            hearing={editingHearing}
            open={hearingDialogOpen}
            onOpenChange={(open) => {
              setHearingDialogOpen(open);
              if (!open) setEditingHearing(null);
            }}
          />

          <LitigationDocumentFormDialog
            matterId={matterId!}
            open={documentDialogOpen}
            onOpenChange={setDocumentDialogOpen}
          />

          <LitigationActivityFormDialog
            matterId={matterId!}
            open={activityDialogOpen}
            onOpenChange={setActivityDialogOpen}
          />

          <MatterAssignmentDialog
            matterId={matterId!}
            open={assignmentDialogOpen}
            onOpenChange={setAssignmentDialogOpen}
          />

          <TaskFormDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            defaultEntityType="litigation_matter"
            defaultEntityId={matterId!}
          />
        </>
      )}
    </>
  );
}
