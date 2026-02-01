import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Calendar, Clock } from 'lucide-react';
import type { AdjustmentSuggestion } from '@/types/escrow';
import { cn } from '@/lib/utils';

interface AdjustmentSuggestionsProps {
  suggestions: AdjustmentSuggestion[];
  onApply: (suggestion: AdjustmentSuggestion) => void;
}

const iconMap = {
  increase_draft: TrendingUp,
  one_time_payment: DollarSign,
  delay_start: Calendar,
  extend_term: Clock,
};

const colorMap = {
  increase_draft: 'text-blue-600 bg-blue-50',
  one_time_payment: 'text-green-600 bg-green-50',
  delay_start: 'text-purple-600 bg-purple-50',
  extend_term: 'text-orange-600 bg-orange-50',
};

export function AdjustmentSuggestions({ suggestions, onApply }: AdjustmentSuggestionsProps) {
  if (suggestions.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Suggested Adjustments</h4>
      <div className="grid gap-3">
        {suggestions.map((suggestion) => {
          const Icon = iconMap[suggestion.type];
          const colorClass = colorMap[suggestion.type];
          
          return (
            <Card key={suggestion.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-medium text-sm">{suggestion.label}</h5>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onApply(suggestion)}
                      >
                        Apply
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {suggestion.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {suggestion.impact}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
