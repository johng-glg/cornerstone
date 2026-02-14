import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  step: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

const STEP_LABELS: Record<string, string> = {
  agreement_sent: 'Agreement Sent',
  agreement_signed: 'Agreement Signed',
  paperwork_received: 'Paperwork Received',
  documents_verified: 'Documents Verified',
};

interface EligibilityPipelineProgressProps {
  checklist: ChecklistItem[];
  onToggle?: (stepIndex: number) => void;
  compact?: boolean;
}

export function EligibilityPipelineProgress({ checklist, onToggle, compact }: EligibilityPipelineProgressProps) {
  const completedCount = checklist.filter((c) => c.completed).length;

  if (compact) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {completedCount}/{checklist.length}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        {checklist.map((item, i) => (
          <div key={item.step} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={cn(
                  'h-0.5 w-6',
                  item.completed ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}
            <button
              type="button"
              onClick={() => onToggle?.(i)}
              disabled={!onToggle}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                item.completed
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground',
                onToggle && 'hover:bg-muted cursor-pointer'
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="hidden sm:inline">{STEP_LABELS[item.step] || item.step}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${(completedCount / checklist.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
