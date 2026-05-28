import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Calendar, DollarSign, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useClientServicesForClient } from '@/hooks/useClientData';
import { ServiceStatusBadges } from '@/components/services/ServiceStatusBadges';
import type { PrimaryServiceStatus, PaymentStatus, RetentionType, ContactStatus } from '@/types/serviceStatus';

interface ClientServicesTabProps {
  clientId: string;
}

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export function ClientServicesTab({ clientId }: ClientServicesTabProps) {
  const { data: services, isLoading } = useClientServicesForClient(clientId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No services found for this client.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <Collapsible
          key={service.id}
          open={expandedId === service.id}
          onOpenChange={(open) => setExpandedId(open ? service.id : null)}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {expandedId === service.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <CardTitle className="text-base font-semibold">
                        {service.service_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {service.program_type === 'debt_settlement' ? 'Consumer Debt Defense' : (service.program_type?.replace('_', ' ') || 'Consumer Debt Defense')}
                      </p>
                    </div>
                  </div>
                  <ServiceStatusBadges
                    primaryStatus={service.status as PrimaryServiceStatus}
                    paymentStatus={service.payment_status as PaymentStatus}
                    retentionFlag={service.retention_flag ?? false}
                    retentionType={service.retention_type as RetentionType}
                    contactStatus={service.contact_status as ContactStatus}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Financial Summary */}
                <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Enrolled Debt</p>
                    <p className="font-semibold">{formatCurrency(service.total_enrolled_debt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">PLSA Balance</p>
                    <p className="font-semibold text-primary">{formatCurrency(service.escrow_balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Payment</p>
                    <p className="font-semibold">{formatCurrency(service.monthly_payment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Settlement Fee</p>
                    <p className="font-semibold">{service.settlement_fee_percentage || 25}%</p>
                  </div>
                </div>

                {/* Program Details */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Enrolled
                    </p>
                    <p className="text-sm">
                      {service.enrolled_date
                        ? format(new Date(service.enrolled_date), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Term</p>
                    <p className="text-sm">{service.term_months ? `${service.term_months} months` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">First Payment</p>
                    <p className="text-sm">
                      {service.first_payment_date
                        ? format(new Date(service.first_payment_date), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Completion</p>
                    <p className="text-sm">
                      {service.estimated_completion_date
                        ? format(new Date(service.estimated_completion_date), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {service.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{service.notes}</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
