import { useState } from 'react';
import { Plus, FileText, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientServices, type ClientService, type ServiceStatus } from '@/hooks/useClientServices';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: 'Prospect', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  suspended: { label: 'Suspended', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
};

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export default function ServicesPage() {
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data: services, isLoading } = useClientServices(
    statusFilter === 'all' ? undefined : statusFilter
  );

  const handleViewService = (service: ClientService) => {
    setSelectedServiceId(service.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage client services and debt settlement programs</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Service
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ServiceStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Enrolled Debt</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : services && services.length > 0 ? (
              services.map((service) => (
                <TableRow
                  key={service.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewService(service)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{service.service_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {service.primary_client ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">
                          {service.primary_client.first_name} {service.primary_client.last_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No client</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[service.status]?.className}>
                      {statusConfig[service.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {service.program_type?.replace('_', ' ') || 'Debt Settlement'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {formatCurrency(service.total_enrolled_debt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(service.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No services found. Create your first service!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <ServiceFormDialog
        open={showForm}
        onOpenChange={setShowForm}
      />

      {/* Detail Sheet */}
      <ServiceDetailSheet
        serviceId={selectedServiceId}
        open={!!selectedServiceId}
        onOpenChange={(open) => !open && setSelectedServiceId(null)}
      />
    </div>
  );
}
