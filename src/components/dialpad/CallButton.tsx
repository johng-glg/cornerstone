import { Button } from '@/components/ui/button';
import { Phone, Loader2 } from 'lucide-react';
import { useInitiateCall } from '@/hooks/useDialpad';
import { cn } from '@/lib/utils';

interface CallButtonProps {
  phone: string | null | undefined;
  entityType?: 'client' | 'lead' | 'litigation_matter' | 'creditor' | 'creditor_contact';
  entityId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
  label?: string;
}

export function CallButton({
  phone,
  entityType,
  entityId,
  variant = 'outline',
  size = 'sm',
  className,
  label,
}: CallButtonProps) {
  const initiate = useInitiateCall();
  if (!phone) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={initiate.isPending}
      onClick={(e) => {
        e.stopPropagation();
        initiate.mutate({
          target_phone: phone,
          related_entity_type: entityType ?? null,
          related_entity_id: entityId ?? null,
        });
      }}
      className={cn('gap-2', className)}
      title={`Call ${phone}`}
    >
      {initiate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
      {size !== 'icon' && (label ?? 'Call')}
    </Button>
  );
}
