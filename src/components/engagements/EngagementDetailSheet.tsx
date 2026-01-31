import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, FileText, Users, Briefcase, Plus } from 'lucide-react';
import { useEngagement, useUpdateEngagementStatus, type EngagementStatus } from '@/hooks/useEngagements';
import { Skeleton } from '@/components/ui/skeleton';
import { EngagementContactsSection } from './EngagementContactsSection';
import { EngagementServicesSection } from './EngagementServicesSection';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EngagementDetailSheetProps {
  engagementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: 'Prospect', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  suspended: { label: 'Suspended', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
};

export function EngagementDetailSheet({ engagementId, open, onOpenChange }: EngagementDetailSheetProps) {
  const { data: engagement, isLoading } = useEngagement(engagementId || undefined);
  const updateStatus = useUpdateEngagementStatus();

  const handleStatusChange = (status: EngagementStatus) => {
    if (engagement) {
      updateStatus.mutate({ id: engagement.id, status });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : engagement ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {engagement.engagement_number}
                  </SheetTitle>
                  {engagement.primary_contact && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {engagement.primary_contact.first_name} {engagement.primary_contact.last_name}
                    </p>
                  )}
                </div>
                <Badge className={statusConfig[engagement.status]?.className}>
                  {statusConfig[engagement.status]?.label}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Change Status</label>
                <Select value={engagement.status} onValueChange={(value) => handleStatusChange(value as EngagementStatus)}>
                  <SelectTrigger className="w-40 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">
                      {format(new Date(engagement.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Updated</label>
                    <p className="text-sm">
                      {format(new Date(engagement.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {engagement.enrolled_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Enrolled Date</label>
                    <p className="text-sm">
                      {format(new Date(engagement.enrolled_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}

                {engagement.closed_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Closed Date</label>
                    <p className="text-sm">
                      {format(new Date(engagement.closed_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}

                {engagement.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm whitespace-pre-wrap">{engagement.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contacts" className="mt-4">
                <EngagementContactsSection
                  engagementId={engagement.id}
                  contacts={engagement.engagement_contacts || []}
                  primaryContactId={engagement.primary_contact_id}
                />
              </TabsContent>

              <TabsContent value="services" className="mt-4">
                <EngagementServicesSection
                  engagementId={engagement.id}
                  services={engagement.engagement_services || []}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="text-muted-foreground">Engagement not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
