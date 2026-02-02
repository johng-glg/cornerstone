import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, User, UserCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DuplicateMatch } from '@/hooks/useDuplicateDetection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: DuplicateMatch[];
  mode: 'create' | 'convert';
  onProceed: () => void;
  isLoading?: boolean;
}

function MatchCard({ match, onView }: { match: DuplicateMatch; onView: () => void }) {
  const isLead = match.type === 'lead';
  const matchTypes = match.matchType.split(', ');

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isLead ? (
            <User className="h-4 w-4 text-muted-foreground" />
          ) : (
            <UserCheck className="h-4 w-4 text-primary" />
          )}
          <div>
            <div className="font-medium text-sm">
              {match.name}
              {isLead && match.leadNumber && (
                <span className="text-muted-foreground ml-1">({match.leadNumber})</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLead ? 'Lead' : 'Client'}
              {match.serviceNumber && ` • Service: ${match.serviceNumber}`}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onView} className="h-7 px-2">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        {match.email && <div>{match.email}</div>}
        {match.phone && <div>{match.phone}</div>}
        <div className="flex items-center gap-2">
          {match.status && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {match.status}
            </Badge>
          )}
          <span>Created {formatDistanceToNow(new Date(match.created_at))} ago</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {matchTypes.map((type) => (
          <Badge
            key={type}
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0',
              match.confidence === 'high' 
                ? 'border-destructive/50 text-destructive' 
                : 'border-warning/50 text-warning-foreground'
            )}
          >
            {type} match
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  matches,
  mode,
  onProceed,
  isLoading,
}: DuplicateWarningDialogProps) {
  const navigate = useNavigate();

  const highConfidenceMatches = matches.filter((m) => m.confidence === 'high');
  const mediumConfidenceMatches = matches.filter((m) => m.confidence === 'medium');
  const hasClientMatch = matches.some((m) => m.type === 'client');

  const handleViewMatch = (match: DuplicateMatch) => {
    onOpenChange(false);
    if (match.type === 'lead') {
      navigate(`/leads?selected=${match.id}`);
    } else {
      navigate(`/clients/${match.id}`);
    }
  };

  // In convert mode with client match, we block proceeding
  const isBlocking = mode === 'convert' && hasClientMatch;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Potential Duplicates Found
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocking ? (
              <>
                This email is already associated with an existing client. You cannot
                proceed with conversion. Please update the lead's email or work with
                the existing client.
              </>
            ) : (
              <>
                We found existing records that may match this lead. Please review
                before proceeding.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {highConfidenceMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                High Confidence Matches
              </div>
              <div className="space-y-2">
                {highConfidenceMatches.map((match) => (
                  <MatchCard
                    key={`${match.type}-${match.id}`}
                    match={match}
                    onView={() => handleViewMatch(match)}
                  />
                ))}
              </div>
            </div>
          )}

          {mediumConfidenceMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                <span className="w-2 h-2 rounded-full bg-warning" />
                Possible Matches
              </div>
              <div className="space-y-2">
                {mediumConfidenceMatches.map((match) => (
                  <MatchCard
                    key={`${match.type}-${match.id}`}
                    match={match}
                    onView={() => handleViewMatch(match)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-shrink-0">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          {!isBlocking && (
            <AlertDialogAction onClick={onProceed} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Proceed Anyway'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
