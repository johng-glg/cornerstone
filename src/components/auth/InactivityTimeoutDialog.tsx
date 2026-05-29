import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InactivityTimeoutDialogProps {
  open: boolean;
  remainingMs: number;
  onStay: () => void;
  onSignOut: () => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Pre-timeout warning with a live countdown and Stay / Sign-out actions. */
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
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll be signed out in{" "}
            <span className="font-mono font-semibold">{formatRemaining(remainingMs)}</span> due to
            inactivity.
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
