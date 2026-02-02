import { ArrowLeft, Mail, Phone, Check, Edit2, MessageSquare, Calendar, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { clientStatusConfig, type ClientStatus } from '@/types/serviceStatus';
import type { Tables } from '@/integrations/supabase/types';

interface ClientHeaderProps {
  client: Tables<'clients'> & {
    phones?: Tables<'client_phones'>[];
    addresses?: Tables<'client_addresses'>[];
  };
  onEdit: () => void;
  onLogCommunication?: () => void;
}

const phoneTypeLabels: Record<string, string> = {
  mobile: 'Mobile',
  home: 'Home',
  work: 'Work',
  fax: 'Fax',
  other: 'Other',
};

export function ClientHeader({ client, onEdit, onLogCommunication }: ClientHeaderProps) {
  const navigate = useNavigate();
  const primaryPhone = client.phones?.find(p => p.is_primary) || client.phones?.[0];
  const clientStatus = (client.status as ClientStatus) || 'inactive';
  const statusConfig = clientStatusConfig[clientStatus];

  // Generate initials for avatar
  const initials = `${client.first_name.charAt(0)}${client.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-6 py-4">
        {/* Back button and actions */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={onLogCommunication}
            >
              <MessageSquare className="h-4 w-4" />
              Log Communication
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Call
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
            <Button variant="default" size="sm" className="gap-2" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>

        {/* Client info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-semibold text-primary">{initials}</span>
          </div>

          {/* Name and contact */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {client.first_name} {client.middle_name ? `${client.middle_name} ` : ''}{client.last_name}
            </h1>
            
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {client.email}
                </span>
              )}
              {primaryPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {primaryPhone.phone_number}
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
              {client.tcpa_consent && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  TCPA Consent
                </Badge>
              )}
              {client.preferred_contact_method && (
                <Badge variant="outline">
                  Preferred: {phoneTypeLabels[client.preferred_contact_method]}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
