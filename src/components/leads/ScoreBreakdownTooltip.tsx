import { SCORE_FACTOR_LABELS, type ScoreBreakdown } from '@/types/scoring';

interface ScoreBreakdownTooltipProps {
  breakdown: ScoreBreakdown;
  total: number;
  label?: string;
}

export function ScoreBreakdownTooltip({ breakdown, total, label }: ScoreBreakdownTooltipProps) {
  const entries = Object.entries(breakdown).filter(([_, points]) => points > 0);

  if (entries.length === 0) {
    return (
      <div className="p-3 text-sm">
        <p className="text-muted-foreground">No score breakdown available</p>
      </div>
    );
  }

  return (
    <div className="p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2 pb-2 border-b">
        <span className="font-semibold text-sm">Score Breakdown</span>
        {label && (
          <span className="text-xs text-muted-foreground">{label}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {entries.map(([factor, points]) => (
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
      <div className="flex items-center justify-between mt-2 pt-2 border-t font-semibold text-sm">
        <span>Total</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
