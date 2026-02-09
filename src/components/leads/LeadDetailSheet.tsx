import { useState } from 'react';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { useLead, useUpdateLeadStatus, type LeadStatus } from '@/hooks/useLeads';
import { useLeadActivities, useCreateLeadActivity } from '@/hooks/useLeadActivities';
import { useCurrentStaff } from '@/hooks/useStaff';
import { useTasks } from '@/hooks/useTasks';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeadFormDialog } from './LeadFormDialog';
import { LeadScoreBadge } from './LeadScoreBadge';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { SCORE_FACTOR_LABELS } from '@/types/scoring';
import { 
  Phone, 
  Mail, 
  DollarSign, 
  Calendar, 
  User,
  FileText,
  MessageSquare,
  ArrowRightCircle,
  Loader2,
  AlertTriangle,
  Pencil,
  Flag,
  CheckCircle2,
  XCircle,
  Target,
  Plus
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeadDetailSheetProps {
  leadId: string | null;
  onClose: () => void;
  onConvert: (leadId: string) => void;
}

export function LeadDetailSheet({ leadId, onClose, onConvert }: LeadDetailSheetProps) {
  const { data: lead, isLoading } = useLead(leadId ?? undefined);
  const { data: activities, isLoading: activitiesLoading } = useLeadActivities(leadId ?? undefined);
  const { data: leadTasks, isLoading: tasksLoading } = useTasks(
    leadId ? { entityType: 'lead', entityId: leadId } : undefined
  );
  const createActivity = useCreateLeadActivity();
  const updateStatus = useUpdateLeadStatus();
  const { data: currentStaff } = useCurrentStaff();
  
  const [activityType, setActivityType] = useState<string>('call');
  const [activityNotes, setActivityNotes] = useState('');
  const [outcome, setOutcome] = useState<string>('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (!leadId) return;
    updateStatus.mutate({ id: leadId, status: newStatus });
  };

  const handleLogActivity = async () => {
    if (!leadId || !activityNotes) return;
    
    await createActivity.mutateAsync({
      lead_id: leadId,
      activity_type: activityType,
      notes: activityNotes,
      outcome: outcome || null,
      staff_id: currentStaff?.id || null,
    });
    
    setActivityNotes('');
    setOutcome('');
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 border-blue-200',
    contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    intake: 'bg-orange-100 text-orange-800 border-orange-200',
    credit_review: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    plan_selection: 'bg-purple-100 text-purple-800 border-purple-200',
    qc_pending: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    docs_pending: 'bg-amber-100 text-amber-800 border-amber-200',
    qualified: 'bg-green-100 text-green-800 border-green-200',
    converted: 'bg-primary/20 text-primary border-primary/30',
    lost: 'bg-muted text-muted-foreground border-muted',
  };

  const statusBadgeColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    in_progress: 'bg-blue-500/10 text-blue-700 border-blue-200',
    completed: 'bg-green-500/10 text-green-700 border-green-200',
    cancelled: 'bg-gray-500/10 text-gray-700 border-gray-200',
  };

  const leadName = lead ? `${lead.first_name} ${lead.last_name}` : '';

  return (
    <Sheet open={!!leadId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : lead ? (
          <>
            <SheetHeader className="pr-8">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="font-heading text-2xl">
                    {lead.first_name} {lead.last_name}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <span>{lead.lead_number}</span>
                    <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
                      <SelectTrigger className={cn('h-7 w-auto gap-1 text-xs border', statusColors[lead.status as keyof typeof statusColors] || 'bg-muted')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </SheetDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="icon" onClick={() => setShowEditDialog(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {lead.status !== 'converted' && lead.status !== 'lost' && (
                    <Button onClick={() => onConvert(lead.id)}>
                      <ArrowRightCircle className="mr-2 h-4 w-4" />
                      Convert
                    </Button>
                  )}
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Lead Score Card */}
                {(lead.lead_score ?? 0) > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Lead Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-3">
                        <LeadScoreBadge 
                          score={lead.lead_score ?? 0} 
                          size="lg" 
                          showTooltip={false}
                        />
                        <div className="text-sm text-muted-foreground">
                          {(lead.lead_score ?? 0) >= 71 && 'Very Hot - Priority lead'}
                          {(lead.lead_score ?? 0) >= 51 && (lead.lead_score ?? 0) < 71 && 'Hot - High potential'}
                          {(lead.lead_score ?? 0) >= 31 && (lead.lead_score ?? 0) < 51 && 'Warm - Moderate potential'}
                          {(lead.lead_score ?? 0) < 31 && 'Cold - Needs qualification'}
                        </div>
                      </div>
                      {lead.score_breakdown_typed && Object.keys(lead.score_breakdown_typed).length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t">
                          {Object.entries(lead.score_breakdown_typed).map(([factor, points]) => (
                            <div key={factor} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {SCORE_FACTOR_LABELS[factor] || factor.replace(/_/g, ' ')}
                              </span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                +{points}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {lead.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                          {lead.phone}
                        </a>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                          {lead.email}
                        </a>
                      </div>
                    )}
                    {lead.assigned_staff && (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={lead.assigned_staff.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {lead.assigned_staff.first_name[0]}{lead.assigned_staff.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{lead.assigned_staff.first_name} {lead.assigned_staff.last_name}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Qualification Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Interest Type</span>
                      <Badge variant="outline" className="capitalize">
                        {lead.interest_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Lead Source</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {lead.source.replace('_', ' ')}
                      </span>
                    </div>
                    {lead.estimated_debt_amount && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Estimated Debt</span>
                        <span className="text-sm font-medium">
                          ${lead.estimated_debt_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {lead.number_of_debts && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Number of Debts</span>
                        <span className="text-sm">{lead.number_of_debts}</span>
                      </div>
                    )}
                    {lead.has_active_lawsuit && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Active Lawsuit</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {lead.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="text-xs text-muted-foreground pt-4">
                  Created {format(new Date(lead.created_at), 'PPP')}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                {leadId && <NotesPanel entityType="lead" entityId={leadId} />}
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {leadTasks?.length || 0} task{leadTasks?.length !== 1 ? 's' : ''}
                  </h4>
                  <Button size="sm" onClick={() => setShowAddTask(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Task
                  </Button>
                </div>

                {tasksLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !leadTasks || leadTasks.length === 0 ? (
                  <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
                    No tasks linked to this lead.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              {task.due_date && (
                                <p className={cn(
                                  'text-xs mt-0.5',
                                  new Date(task.due_date) < new Date() && task.status !== 'completed'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                                )}>
                                  Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1.5">
                              <Badge className={statusBadgeColors[task.status] || ''} variant="outline">
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Log Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Select value={activityType} onValueChange={setActivityType}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={outcome} onValueChange={setOutcome}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="answered">Answered</SelectItem>
                          <SelectItem value="voicemail">Voicemail</SelectItem>
                          <SelectItem value="no_answer">No Answer</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={activityNotes}
                      onChange={(e) => setActivityNotes(e.target.value)}
                      placeholder="Activity notes..."
                      rows={3}
                    />
                    <Button 
                      onClick={handleLogActivity} 
                      disabled={!activityNotes || createActivity.isPending}
                      size="sm"
                    >
                      {createActivity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Log Activity
                    </Button>
                  </CardContent>
                </Card>

                {/* Stage Transition Timeline */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Stage History</h4>
                  <div className="space-y-2">
                    {lead.new_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <Flag className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">New</span>
                        <span className="text-muted-foreground">
                          {format(new Date(lead.new_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                    {lead.contacted_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Contacted</span>
                        <span className="text-muted-foreground">
                          {format(new Date(lead.contacted_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                    {lead.qualified_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Qualified</span>
                        <span className="text-muted-foreground">
                          {format(new Date(lead.qualified_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                    {lead.converted_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <ArrowRightCircle className="h-4 w-4 text-primary" />
                        <span className="font-medium">Converted</span>
                        <span className="text-muted-foreground">
                          {format(new Date(lead.converted_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                    {lead.lost_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Lost</span>
                        <span className="text-muted-foreground">
                          {format(new Date(lead.lost_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Activity Timeline</h4>
                  {activitiesLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : activities?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activities yet</p>
                  ) : (
                    <div className="space-y-3">
                      {activities?.map((activity) => (
                        <Card key={activity.id} className="bg-muted/50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <ActivityIcon type={activity.activity_type} />
                                <div>
                                  <span className="text-sm font-medium capitalize">
                                    {activity.activity_type}
                                  </span>
                                  {activity.outcome && (
                                    <Badge variant="outline" className="ml-2 text-[10px]">
                                      {activity.outcome}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {activity.notes && (
                              <p className="text-sm mt-2 text-muted-foreground">{activity.notes}</p>
                            )}
                            {activity.staff && (
                              <p className="text-xs text-muted-foreground mt-2">
                                by {activity.staff.first_name} {activity.staff.last_name}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <LeadFormDialog
              open={showEditDialog}
              onOpenChange={setShowEditDialog}
              lead={lead}
            />
            <TaskFormDialog
              open={showAddTask}
              onOpenChange={setShowAddTask}
              defaultEntityType="lead"
              defaultEntityId={leadId || undefined}
              defaultEntityLabel={leadName}
            />
            <TaskDetailSheet
              taskId={selectedTaskId}
              open={!!selectedTaskId}
              onOpenChange={(open) => !open && setSelectedTaskId(null)}
              onEdit={() => {}}
            />
          </>
        ) : (
          <p className="text-muted-foreground">Lead not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'call':
      return <Phone className="h-4 w-4 text-primary" />;
    case 'email':
      return <Mail className="h-4 w-4 text-primary" />;
    case 'sms':
      return <MessageSquare className="h-4 w-4 text-primary" />;
    default:
      return <FileText className="h-4 w-4 text-primary" />;
  }
}
