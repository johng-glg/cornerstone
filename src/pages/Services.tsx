import { useState } from 'react';
import { Plus, FileText, User, DollarSign, AlertTriangle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientServices, type ClientService, type ServiceFilters } from '@/hooks/useClientServices';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { ServiceStatusBadges } from '@/components/services/ServiceStatusBadges';
import { format } from 'date-fns';
import type { PrimaryServiceStatus, PaymentStatus, ContactStatus } from '@/types/serviceStatus';

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export default function ServicesPage() {
  const [filters, setFilters] = useState<ServiceFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data: services, isLoading } = useClientServices(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const handleViewService = (service: ClientService) => {
    setSelectedServiceId(service.id);
  };

  const updateFilter = <K extends keyof ServiceFilters>(key: K, value: ServiceFilters[K] | 'all') => {
    setFilters(prev => {
      const next = { ...prev };
      if (value === 'all' || value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const clearFilters = () => setFilters({});
  const hasFilters = Object.keys(filters).length > 0;

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
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select 
          value={filters.primaryStatus || 'all'} 
          onValueChange={(v) => updateFilter('primaryStatus', v as PrimaryServiceStatus)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
            <SelectItem value="dropped">Dropped</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.paymentStatus || 'all'} 
          onValueChange={(v) => updateFilter('paymentStatus', v === 'all' ? undefined : v as PaymentStatus)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="nsf">NSF</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.contactStatus || 'all'} 
          onValueChange={(v) => updateFilter('contactStatus', v === 'all' ? undefined : v as ContactStatus)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contact</SelectItem>
            <SelectItem value="reachable">Reachable</SelectItem>
            <SelectItem value="hard_to_reach">Hard to Reach</SelectItem>
            <SelectItem value="unreachable">Unreachable</SelectItem>
            <SelectItem value="no_contact_allowed">No Contact</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.retentionFlag === true ? 'flagged' : filters.retentionFlag === false ? 'not_flagged' : 'all'} 
          onValueChange={(v) => updateFilter('retentionFlag', v === 'all' ? undefined : v === 'flagged' ? true : false)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Retention" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Retention</SelectItem>
            <SelectItem value="flagged">
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Flagged
              </span>
            </SelectItem>
            <SelectItem value="not_flagged">Not Flagged</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
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
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
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
                    <ServiceStatusBadges
                      primaryStatus={service.status as PrimaryServiceStatus}
                      paymentStatus={service.payment_status as PaymentStatus}
                      retentionFlag={service.retention_flag ?? false}
                      retentionType={service.retention_type as any}
                      contactStatus={service.contact_status as ContactStatus}
                      compact
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">
                      {service.program_type?.replace('_', ' ') || 'Debt Settlement'}
                    </span>
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
                  {hasFilters ? 'No services match your filters' : 'No services found. Create your first service!'}
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
