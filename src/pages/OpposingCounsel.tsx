import { useState } from 'react';
import { Plus, Search, Building2, Phone, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLawFirms, type LawFirm } from '@/hooks/useLawFirms';
import { LawFirmFormDialog } from '@/components/opposing-counsel/LawFirmFormDialog';
import { LawFirmDetailSheet } from '@/components/opposing-counsel/LawFirmDetailSheet';
import { format } from 'date-fns';

export default function OpposingCounselPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [editingFirm, setEditingFirm] = useState<LawFirm | null>(null);

  const { data: firms, isLoading } = useLawFirms(search || undefined);

  const handleViewFirm = (firm: LawFirm) => {
    setSelectedFirmId(firm.id);
  };

  const handleEditFirm = (firm: LawFirm) => {
    setEditingFirm(firm);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Opposing Counsel</h1>
          <p className="text-muted-foreground">Manage law firms and attorney contacts for litigation matters</p>
        </div>
        <Button onClick={() => { setEditingFirm(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Law Firm
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search law firms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Law Firms Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Firm Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead># Contacts</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : firms && firms.length > 0 ? (
              firms.map((firm) => (
                <TableRow
                  key={firm.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewFirm(firm)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{firm.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {firm.phone ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {firm.phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {firm.email ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {firm.email}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {firm.city && firm.state 
                      ? `${firm.city}, ${firm.state}` 
                      : firm.state || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {firm.contact_count || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(firm.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search 
                    ? 'No law firms match your search' 
                    : 'No law firms yet. Add your first law firm!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <LawFirmFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        firm={editingFirm}
      />

      {/* Detail Sheet */}
      <LawFirmDetailSheet
        firmId={selectedFirmId}
        open={!!selectedFirmId}
        onOpenChange={(open) => !open && setSelectedFirmId(null)}
        onEdit={() => {
          const firm = firms?.find((f) => f.id === selectedFirmId);
          if (firm) {
            setSelectedFirmId(null);
            handleEditFirm(firm);
          }
        }}
      />
    </div>
  );
}
