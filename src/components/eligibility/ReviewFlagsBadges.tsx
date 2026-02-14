import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EligibilityFlag } from '@/hooks/useEligibilityReviews';

interface ReviewFlagsBadgesProps {
  flags: EligibilityFlag[];
  compact?: boolean;
}

const severityConfig = {
  info: {
    icon: Info,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  critical: {
    icon: AlertCircle,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  },
};

export function ReviewFlagsBadges({ flags, compact = false }: ReviewFlagsBadgesProps) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
      {flags.map((flag) => {
        const config = severityConfig[flag.severity] || severityConfig.info;
        const Icon = config.icon;
        return (
          <Badge
            key={flag.code}
            variant="outline"
            className={cn(config.className, compact ? 'text-[10px] px-1.5 py-0' : 'text-xs')}
            title={flag.details}
          >
            <Icon className={cn('mr-1', compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
            {flag.label}
          </Badge>
        );
      })}
    </div>
  );
}
