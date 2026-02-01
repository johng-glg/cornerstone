import { useState } from 'react';
import { Plus, Search, Building2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditors, type Creditor, type CreditorType } from '@/hooks/useCreditors';
import { CreditorFormDialog } from '@/components/creditors/CreditorFormDialog';
import { CreditorDetailSheet } from '@/components/creditors/CreditorDetailSheet';
import { format } from 'date-fns';

const creditorTypeLabels: Record<string, string> = {
  original_creditor: 'Original Creditor',
  collection_agency: 'Collection Agency',
  law_firm: 'Law Firm',
  debt_buyer: 'Debt Buyer',
};

const creditorTypeBadgeColors: Record<string, string> = {
  original_creditor: 'bg-blue-100 text-blue-800',
  collection_agency: 'bg-orange-100 text-orange-800',
  law_firm: 'bg-purple-100 text-purple-800',
  debt_buyer: 'bg-red-100 text-red-800',
};

export default function CreditorsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CreditorType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedCreditorId, setSelectedCreditorId] = useState<string | null>(null);
  const [editingCreditor, setEditingCreditor] = useState<Creditor | null>(null);

  const { data: creditors, isLoading } = useCreditors(
    search || undefined, 
    typeFilter === 'all' ? undefined : typeFilter
  );

  const handleViewCreditor = (creditor: Creditor) => {
    setSelectedCreditorId(creditor.id);
  };

  const handleEditCreditor = (creditor: Creditor) => {
    setEditingCreditor(creditor);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creditors</h1>
          <p className="text-muted-foreground">Manage creditor directory and contact information</p>
        </div>
        <Button onClick={() => { setEditingCreditor(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Creditor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creditors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as CreditorType | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(creditorTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Creditors Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : creditors && creditors.length > 0 ? (
              creditors.map((creditor) => (
                <TableRow
                  key={creditor.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewCreditor(creditor)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{creditor.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={creditorTypeBadgeColors[creditor.creditor_type]}>
                      {creditorTypeLabels[creditor.creditor_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {creditor.phone ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {creditor.phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {creditor.email ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {creditor.email}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {creditor.city && creditor.state 
                      ? `${creditor.city}, ${creditor.state}` 
                      : creditor.state || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(creditor.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search || typeFilter !== 'all' 
                    ? 'No creditors match your filters' 
                    : 'No creditors yet. Add your first creditor!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <CreditorFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        creditor={editingCreditor}
      />

      {/* Detail Sheet */}
      <CreditorDetailSheet
        creditorId={selectedCreditorId}
        open={!!selectedCreditorId}
        onOpenChange={(open) => !open && setSelectedCreditorId(null)}
        onEdit={() => {
          const creditor = creditors?.find((c) => c.id === selectedCreditorId);
          if (creditor) {
            setSelectedCreditorId(null);
            handleEditCreditor(creditor);
          }
        }}
      />
    </div>
  );
}
