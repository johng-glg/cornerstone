import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScoreBreakdownTooltip } from './ScoreBreakdownTooltip';
import type { ScoreBreakdown } from '@/types/scoring';

interface LeadScoreBadgeProps {
  score: number;
  breakdown?: ScoreBreakdown | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function LeadScoreBadge({ 
  score, 
  breakdown, 
  size = 'md',
  showTooltip = true 
}: LeadScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 71) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    if (score >= 51) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    if (score >= 31) return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 71) return 'Very Hot';
    if (score >= 51) return 'Hot';
    if (score >= 31) return 'Warm';
    return 'Cold';
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    md: 'px-2 py-0.5 text-xs gap-1',
    lg: 'px-3 py-1 text-sm gap-1.5',
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const badge = (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        getScoreColor(score),
        sizeClasses[size]
      )}
    >
      {score >= 71 && <Flame className={iconSizes[size]} />}
      <span>{score}</span>
    </div>
  );

  if (showTooltip && breakdown && Object.keys(breakdown).length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="p-0">
            <ScoreBreakdownTooltip 
              breakdown={breakdown} 
              total={score} 
              label={getScoreLabel(score)} 
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
