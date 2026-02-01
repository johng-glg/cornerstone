import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import {
  primaryStatusConfig,
  paymentStatusConfig,
  retentionTypeConfig,
  contactStatusConfig,
  type PrimaryServiceStatus,
  type PaymentStatus,
  type RetentionType,
  type ContactStatus,
} from '@/types/serviceStatus';

interface ServiceStatusBadgesProps {
  primaryStatus: PrimaryServiceStatus;
  paymentStatus?: PaymentStatus;
  retentionFlag?: boolean;
  retentionType?: RetentionType;
  contactStatus?: ContactStatus;
  showLabels?: boolean;
  compact?: boolean;
}

export function ServiceStatusBadges({
  primaryStatus,
  paymentStatus,
  retentionFlag,
  retentionType,
  contactStatus,
  showLabels = false,
  compact = false,
}: ServiceStatusBadgesProps) {
  // Fallback for invalid/legacy status values
  const primaryConfig = primaryStatusConfig[primaryStatus] || {
    label: primaryStatus || 'Unknown',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    description: 'Unknown status'
  };
  const isActive = primaryStatus === 'active';

  return (
    <TooltipProvider>
      <div className={`flex flex-wrap gap-1 ${compact ? 'gap-0.5' : 'gap-1.5'}`}>
        {/* Primary Status - Always show */}
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`${primaryConfig.className} ${compact ? 'text-xs px-1.5 py-0' : ''}`}>
              {primaryConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{primaryConfig.description}</p>
          </TooltipContent>
        </Tooltip>

        {/* Payment Status - Only show for active services and when not 'current' */}
        {isActive && paymentStatus && paymentStatus !== 'current' && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`${paymentStatusConfig[paymentStatus].className} ${compact ? 'text-xs px-1.5 py-0' : ''}`}>
                {paymentStatusConfig[paymentStatus].label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{paymentStatusConfig[paymentStatus].description}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Retention Flag - Show if flagged */}
        {retentionFlag && retentionType && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`${retentionTypeConfig[retentionType].className} ${compact ? 'text-xs px-1.5 py-0' : ''} flex items-center gap-1`}>
                <AlertTriangle className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                {showLabels ? retentionTypeConfig[retentionType].label : 'Retention'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{retentionTypeConfig[retentionType].description}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Contact Status - Only show if not 'reachable' */}
        {contactStatus && contactStatus !== 'reachable' && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`${contactStatusConfig[contactStatus].className} ${compact ? 'text-xs px-1.5 py-0' : ''}`}>
                {contactStatusConfig[contactStatus].label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{contactStatusConfig[contactStatus].description}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Simple badge for just the primary status
export function PrimaryStatusBadge({ status, compact = false }: { status: PrimaryServiceStatus; compact?: boolean }) {
  const config = primaryStatusConfig[status] || {
    label: status || 'Unknown',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <Badge className={`${config.className} ${compact ? 'text-xs px-1.5 py-0' : ''}`}>
      {config.label}
    </Badge>
  );
}

// Payment status indicator
export function PaymentStatusBadge({ status, compact = false }: { status: NonNullable<PaymentStatus>; compact?: boolean }) {
  const config = paymentStatusConfig[status];
  return (
    <Badge className={`${config.className} ${compact ? 'text-xs px-1.5 py-0' : ''}`}>
      {config.label}
    </Badge>
  );
}

// Contact status indicator
export function ContactStatusBadge({ status, compact = false }: { status: ContactStatus; compact?: boolean }) {
  const config = contactStatusConfig[status];
  return (
    <Badge className={`${config.className} ${compact ? 'text-xs px-1.5 py-0' : ''}`}>
      {config.label}
    </Badge>
  );
}
