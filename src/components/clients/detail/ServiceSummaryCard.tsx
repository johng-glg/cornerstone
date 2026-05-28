import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, DollarSign, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ServiceStatusBadges } from '@/components/services/ServiceStatusBadges';
import type { ClientServiceForClient } from '@/hooks/useClientData';
import type { PrimaryServiceStatus, PaymentStatus, RetentionType, ContactStatus } from '@/types/serviceStatus';

interface ServiceSummaryCardProps {
  service: ClientServiceForClient;
  onClick?: () => void;
}

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount) : '$0';

export function ServiceSummaryCard({ service, onClick }: ServiceSummaryCardProps) {
  const enrolledDate = service.enrolled_date 
    ? format(new Date(service.enrolled_date), 'M/d/yy')
    : null;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {service.service_number}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {service.program_type === 'debt_settlement' ? 'Consumer Debt Defense' : (service.program_type?.replace('_', ' ') || 'Consumer Debt Defense')}
              {enrolledDate && ` • Enrolled ${enrolledDate}`}
            </p>
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
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
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
          </div>
          <Button variant="ghost" size="sm" className="gap-1">
            View Details
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
