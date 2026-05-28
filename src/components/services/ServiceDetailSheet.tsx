import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, FileText, DollarSign, Briefcase, Edit2, ExternalLink, CloudUpload, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { useClientService, useUpdatePrimaryStatus, useUpdatePaymentStatus, useUpdateContactStatus, useUpdateRetention } from '@/hooks/useClientServices';
import { useServiceStatusHistory } from '@/hooks/useServiceStatusHistory';
import { useRegisterForthClient, usePauseForthClient, useResumeForthClient } from '@/hooks/useForthApi';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ServiceStatusBadges, PrimaryStatusBadge, PaymentStatusBadge, ContactStatusBadge } from './ServiceStatusBadges';
import { StatusChangeModal } from './StatusChangeModal';
import { RetentionPanel } from './RetentionPanel';
import { PaymentSchedulePanel } from '@/components/payments/PaymentSchedulePanel';
import { primaryStatusConfig, paymentStatusConfig, contactStatusConfig } from '@/types/serviceStatus';
import type { PrimaryServiceStatus, PaymentStatus, ContactStatus, RetentionType } from '@/types/serviceStatus';

interface ServiceDetailSheetProps {
  serviceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export function ServiceDetailSheet({ serviceId, open, onOpenChange }: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { data: service, isLoading } = useClientService(serviceId || undefined);
  const { data: statusHistory } = useServiceStatusHistory(serviceId || undefined);
  const updatePrimaryStatus = useUpdatePrimaryStatus();
  const updatePaymentStatus = useUpdatePaymentStatus();
  const updateContactStatus = useUpdateContactStatus();
  const updateRetention = useUpdateRetention();
  const registerForthClient = useRegisterForthClient();

  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    dimension: 'primary' | 'payment' | 'contact';
  }>({ open: false, dimension: 'primary' });

  // Check if client is registered with Forth Pay
  const hasForthId = service?.primary_client?.forth_crm_id;

  const handleStatusChange = (newValue: string, reason: string) => {
    if (!service) return;

    switch (statusModal.dimension) {
      case 'primary':
        updatePrimaryStatus.mutate({
          id: service.id,
          oldStatus: service.status,
          newStatus: newValue as PrimaryServiceStatus,
          reason,
        });
        break;
      case 'payment':
        updatePaymentStatus.mutate({
          id: service.id,
          oldStatus: service.payment_status as string | null,
          newStatus: newValue as PaymentStatus,
          reason,
        });
        break;
      case 'contact':
        updateContactStatus.mutate({
          id: service.id,
          oldStatus: service.contact_status as string | null,
          newStatus: newValue as ContactStatus,
          reason,
        });
        break;
    }
  };

  const handleRetentionUpdate = (data: {
    retention_flag: boolean;
    retention_type: RetentionType;
    retention_date: string | null;
    retention_reason: string | null;
    retention_assigned_to: string | null;
  }) => {
    if (!service) return;
    updateRetention.mutate({
      id: service.id,
      ...data,
      oldRetentionType: service.retention_type as RetentionType,
    });
  };

  const isActive = service?.status === 'active';

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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 p-0 h-auto font-normal"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/clients/${service.primary_client!.id}`);
                      }}
                    >
                      <User className="h-3 w-3" />
                      {service.primary_client.first_name} {service.primary_client.last_name}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
                <ServiceStatusBadges
                  primaryStatus={service.status as PrimaryServiceStatus}
                  paymentStatus={service.payment_status as PaymentStatus}
                  retentionFlag={service.retention_flag ?? false}
                  retentionType={service.retention_type as RetentionType}
                  contactStatus={service.contact_status as ContactStatus}
                />
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            <Tabs defaultValue="status" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="program">Program</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
              </TabsList>

              <TabsContent value="status" className="space-y-4 mt-4">
                {/* Status Overview Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Primary Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Primary Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          <PrimaryStatusBadge status={service.status as PrimaryServiceStatus} />
                          {service.primary_status_changed_at && (
                            <span className="text-xs text-muted-foreground">
                              Changed {format(new Date(service.primary_status_changed_at), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusModal({ open: true, dimension: 'primary' })}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Payment Status - Only show for active services */}
                    {isActive && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Status</p>
                          <div className="flex items-center gap-2 mt-1">
                            {service.payment_status ? (
                              <PaymentStatusBadge status={service.payment_status as NonNullable<PaymentStatus>} />
                            ) : (
                              <Badge variant="outline">Not Set</Badge>
                            )}
                            {service.payment_status_changed_at && (
                              <span className="text-xs text-muted-foreground">
                                Changed {format(new Date(service.payment_status_changed_at), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatusModal({ open: true, dimension: 'payment' })}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Contact Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Contact Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          <ContactStatusBadge status={service.contact_status as ContactStatus || 'reachable'} />
                          {service.contact_status_changed_at && (
                            <span className="text-xs text-muted-foreground">
                              Changed {format(new Date(service.contact_status_changed_at), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusModal({ open: true, dimension: 'contact' })}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Retention Panel */}
                <RetentionPanel
                  retentionFlag={service.retention_flag ?? false}
                  retentionType={service.retention_type as RetentionType}
                  retentionDate={service.retention_date as string | null}
                  retentionReason={service.retention_reason as string | null}
                  retentionAssignedTo={service.retention_assigned_to as string | null}
                  onUpdate={handleRetentionUpdate}
                  isPending={updateRetention.isPending}
                />

                {/* Status History */}
                {statusHistory && statusHistory.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Recent Status Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {statusHistory.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="text-sm border-l-2 border-muted pl-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{entry.status_dimension}</span>
                              <span className="text-muted-foreground">→</span>
                              <span>{entry.new_value}</span>
                            </div>
                            {entry.reason && (
                              <p className="text-muted-foreground text-xs mt-0.5">{entry.reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                              {entry.staff && ` by ${entry.staff.first_name} ${entry.staff.last_name}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="program" className="space-y-4 mt-4">
                {/* Forth Pay Registration Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CloudUpload className="h-4 w-4" />
                      Forth Pay Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasForthId ? (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">Registered with Forth Pay</span>
                        <Badge variant="outline" className="ml-auto">
                          ID: {service.primary_client?.forth_crm_id}
                        </Badge>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          This client is not yet registered with Forth Pay. Register to enable payment drafts.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!service?.primary_client) return;
                            
                            // We need to fetch full client data to register
                            // For now, show a placeholder - full implementation would need client addresses/phones
                            registerForthClient.mutate({
                              client_id: service.primary_client.id,
                              client_service_id: service.id,
                              client_data: {
                                first_name: service.primary_client.first_name,
                                last_name: service.primary_client.last_name,
                                middle_name: service.primary_client.middle_name || undefined,
                                address: '', // Would need to fetch from client_addresses
                                city: '',
                                state: '',
                                zip: '',
                                email: service.primary_client.email || '',
                                phone: '', // Would need to fetch from client_phones
                                date_of_birth: service.primary_client.date_of_birth || '',
                              },
                              debts: [], // Would need to fetch from liabilities
                            });
                          }}
                          disabled={registerForthClient.isPending}
                        >
                          {registerForthClient.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            <>
                              <CloudUpload className="h-4 w-4 mr-2" />
                              Register with Forth Pay
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
                        <p className="font-medium capitalize">{service.program_type === 'debt_settlement' ? 'Consumer Debt Defense' : (service.program_type?.replace('_', ' ') || 'Consumer Debt Defense')}</p>
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

                {serviceId && <NotesPanel entityType="client_service" entityId={serviceId} />}
              </TabsContent>

              <TabsContent value="financials" className="space-y-4 mt-4">
                {/* Payment Schedule Panel */}
                <PaymentSchedulePanel 
                  clientServiceId={service.id}
                  termMonths={service.term_months}
                  totalEnrolledDebt={service.total_enrolled_debt}
                />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Payment Details
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
                        <p className="text-sm text-muted-foreground">PLSA Balance</p>
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

            {/* Status Change Modal */}
            <StatusChangeModal
              open={statusModal.open}
              onOpenChange={(open) => setStatusModal(prev => ({ ...prev, open }))}
              dimension={statusModal.dimension}
              currentValue={
                statusModal.dimension === 'primary' ? service.status :
                statusModal.dimension === 'payment' ? service.payment_status as string :
                service.contact_status as string
              }
              onSubmit={handleStatusChange}
              isPending={
                updatePrimaryStatus.isPending || 
                updatePaymentStatus.isPending || 
                updateContactStatus.isPending
              }
            />
          </>
        ) : (
          <p className="text-muted-foreground">Service not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
