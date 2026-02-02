import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useLeads, useUpdateLeadStatus, type Lead, type LeadStatus } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Mail, DollarSign, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeadKanbanProps {
  onLeadClick: (leadId: string) => void;
}

const PIPELINE_STAGES: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'bg-blue-500' },
  { status: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { status: 'qualified', label: 'Qualified', color: 'bg-green-500' },
  { status: 'converted', label: 'Converted', color: 'bg-primary' },
  { status: 'lost', label: 'Lost', color: 'bg-muted' },
];

export function LeadKanban({ onLeadClick }: LeadKanbanProps) {
  const { data: leadsResult, isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const newStatus = result.destination.droppableId as LeadStatus;
    const leadId = result.draggableId;
    
    updateStatus.mutate({ id: leadId, status: newStatus });
  };

  const getLeadsByStatus = (status: LeadStatus) => 
    leadsResult?.data?.filter(lead => lead.status === status) || [];

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage.status} className="min-w-[280px] flex-shrink-0">
            <Skeleton className="h-10 w-full mb-3" />
            <Skeleton className="h-32 w-full mb-2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage.status} className="min-w-[280px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-3 h-3 rounded-full', stage.color)} />
              <h3 className="font-semibold text-foreground">{stage.label}</h3>
              <Badge variant="secondary" className="ml-auto">
                {getLeadsByStatus(stage.status).length}
              </Badge>
            </div>
            
            <Droppable droppableId={stage.status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'min-h-[400px] rounded-lg border-2 border-dashed p-2 transition-colors',
                    snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  {getLeadsByStatus(stage.status).map((lead, index) => (
                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <LeadCard 
                            lead={lead} 
                            isDragging={snapshot.isDragging}
                            onClick={() => onLeadClick(lead.id)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

interface LeadCardProps {
  lead: Lead;
  isDragging: boolean;
  onClick: () => void;
}

function LeadCard({ lead, isDragging, onClick }: LeadCardProps) {
  const interestColors = {
    debt_resolution: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    litigation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    both: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  return (
    <Card 
      className={cn(
        'mb-2 cursor-pointer transition-all hover:shadow-md',
        isDragging && 'rotate-2 shadow-lg'
      )}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {lead.first_name} {lead.last_name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{lead.lead_number}</p>
          </div>
          {lead.assigned_staff && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={lead.assigned_staff.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {lead.assigned_staff.first_name[0]}{lead.assigned_staff.last_name[0]}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        <Badge className={cn('text-[10px]', interestColors[lead.interest_type])}>
          {lead.interest_type.replace('_', ' ')}
        </Badge>
        
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {lead.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.estimated_debt_amount && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>${lead.estimated_debt_amount.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
