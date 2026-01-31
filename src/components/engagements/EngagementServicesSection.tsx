import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useAddEngagementService, useRemoveEngagementService } from '@/hooks/useEngagements';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';

interface EngagementServicesSectionProps {
  engagementId: string;
  services: (Tables<'engagement_services'> & {
    service?: Tables<'services'>;
  })[];
}

const serviceTypeLabels: Record<string, string> = {
  debt_resolution: 'Debt Resolution',
  consumer_defense: 'Consumer Defense',
  hybrid: 'Hybrid',
};

export function EngagementServicesSection({ engagementId, services }: EngagementServicesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  
  const { data: allServices } = useServices();
  const addService = useAddEngagementService();
  const removeService = useRemoveEngagementService();

  const handleAddService = async () => {
    if (!selectedServiceId) return;
    
    await addService.mutateAsync({
      engagement_id: engagementId,
      service_id: selectedServiceId,
      start_date: new Date().toISOString().split('T')[0],
    });
    
    setShowAddForm(false);
    setSelectedServiceId('');
  };

  const availableServices = allServices?.filter(
    (s) => !services.some((es) => es.service_id === s.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Assigned Services</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Service
        </Button>
      </div>

      {showAddForm && (
        <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
          <div>
            <label className="text-sm font-medium">Service</label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {availableServices?.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddService} disabled={!selectedServiceId || addService.isPending}>
              Add
            </Button>
          </div>
        </div>
      )}

      {services.length > 0 ? (
        <div className="space-y-2">
          {services.map((es) => (
            <div key={es.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{es.service?.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {es.service?.service_type ? serviceTypeLabels[es.service.service_type] : 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Started: {format(new Date(es.start_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeService.mutate({ id: es.id, engagementId })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No services assigned to this engagement
        </p>
      )}
    </div>
  );
}
