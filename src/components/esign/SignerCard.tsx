import { CheckCircle2, Clock, Eye, XCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SignatureSigner, SignerStatus } from '@/types/esign';
import { SIGNER_STATUS_LABELS, SIGNER_ROLE_LABELS } from '@/types/esign';
import { format } from 'date-fns';

interface SignerCardProps {
  signer: SignatureSigner;
  onResend?: () => void;
  showActions?: boolean;
}

const statusIcons: Record<SignerStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  viewed: <Eye className="h-4 w-4" />,
  signed: <CheckCircle2 className="h-4 w-4" />,
  declined: <XCircle className="h-4 w-4" />,
};

const statusVariants: Record<SignerStatus, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  sent: 'outline',
  viewed: 'outline',
  signed: 'default',
  declined: 'destructive',
};

export function SignerCard({ signer, onResend, showActions = false }: SignerCardProps) {
  const roleLabel = SIGNER_ROLE_LABELS[signer.signer_role] || signer.signer_role;
  const statusLabel = SIGNER_STATUS_LABELS[signer.status];
  const canResend = ['pending', 'sent', 'viewed'].includes(signer.status);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-medium text-sm">{signer.name}</span>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {signer.signed_at && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(signer.signed_at), 'MMM d, h:mm a')}
          </span>
        )}
        
        <Badge variant={statusVariants[signer.status]} className="gap-1">
          {statusIcons[signer.status]}
          {statusLabel}
        </Badge>

        {showActions && canResend && onResend && (
          <Button variant="ghost" size="sm" onClick={onResend}>
            Resend
          </Button>
        )}
      </div>
    </div>
  );
}
