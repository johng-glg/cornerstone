import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, FileText, DollarSign, Briefcase } from 'lucide-react';
import { useClientService, useUpdateClientServiceStatus, type ServiceStatus } from '@/hooks/useClientServices';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ServiceDetailSheetProps {
  serviceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: 'Prospect', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  suspended: { label: 'Suspended', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
};

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export function ServiceDetailSheet({ serviceId, open, onOpenChange }: ServiceDetailSheetProps) {
  const { data: service, isLoading } = useClientService(serviceId || undefined);
  const updateStatus = useUpdateClientServiceStatus();

  const handleStatusChange = (status: ServiceStatus) => {
    if (service) {
      updateStatus.mutate({ id: service.id, status });
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
        ) : service ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {service.service_number}
                  </SheetTitle>
                  {service.primary_client && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {service.primary_client.first_name} {service.primary_client.last_name}
                    </p>
                  )}
                </div>
                <Badge className={statusConfig[service.status]?.className}>
                  {statusConfig[service.status]?.label}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Change Status</label>
                <Select value={service.status} onValueChange={(value) => handleStatusChange(value as ServiceStatus)}>
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

            <Tabs defaultValue="program" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="program">Program Details</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
              </TabsList>

              <TabsContent value="program" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Program Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Program Type</p>
                        <p className="font-medium capitalize">{service.program_type?.replace('_', ' ') || 'Debt Settlement'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Term</p>
                        <p className="font-medium">{service.term_months ? `${service.term_months} months` : '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {service.program_start_date 
                            ? format(new Date(service.program_start_date), 'MMM d, yyyy')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Est. Completion</p>
                        <p className="font-medium">
                          {service.estimated_completion_date 
                            ? format(new Date(service.estimated_completion_date), 'MMM d, yyyy')
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm">{format(new Date(service.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Updated</p>
                        <p className="text-sm">{format(new Date(service.updated_at), 'MMM d, yyyy')}</p>
                      </div>
                      {service.enrolled_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Enrolled</p>
                          <p className="text-sm">{format(new Date(service.enrolled_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                      {service.closed_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Closed</p>
                          <p className="text-sm">{format(new Date(service.closed_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {service.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{service.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="financials" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Payment Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Payment</p>
                        <p className="text-lg font-semibold">{formatCurrency(service.monthly_payment)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Frequency</p>
                        <p className="font-medium capitalize">{service.payment_frequency || 'Monthly'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-muted-foreground">First Payment</p>
                        <p className="text-sm">
                          {service.first_payment_date 
                            ? format(new Date(service.first_payment_date), 'MMM d, yyyy')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Escrow Balance</p>
                        <p className="text-lg font-semibold text-primary">{formatCurrency(service.escrow_balance)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Debt & Fees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Enrolled Debt</p>
                        <p className="text-lg font-semibold">{formatCurrency(service.total_enrolled_debt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Settlement Fee</p>
                        <p className="font-medium">{service.settlement_fee_percentage || 25}%</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground">Monthly Service Fee</p>
                      <p className="font-medium">{formatCurrency(service.monthly_service_fee)}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="text-muted-foreground">Service not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
