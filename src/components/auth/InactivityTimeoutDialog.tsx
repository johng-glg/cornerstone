import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

interface InactivityTimeoutDialogProps {
  open: boolean;
  remainingMs: number;
  onStay: () => void;
  onSignOut: () => void;
}

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export function InactivityTimeoutDialog({
  open,
  remainingMs,
  onStay,
  onSignOut,
}: InactivityTimeoutDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            You're about to be signed out
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                For your security, you'll be signed out automatically after a period of inactivity.
              </p>
              <p className="text-foreground font-medium">
                Time remaining: <span className="tabular-nums">{formatRemaining(remainingMs)}</span>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSignOut}>Sign out now</AlertDialogCancel>
          <AlertDialogAction onClick={onStay}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
