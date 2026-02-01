import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Mail, Globe, Pencil, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyFormDialog } from '@/components/companies/CompanyFormDialog';
import { Tables } from '@/integrations/supabase/types';

type Company = Tables<'companies'>;

export default function CompaniesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const getCompanyTypeBadge = (type: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      law_firm: { variant: 'default', label: 'Law Firm' },
      affiliate: { variant: 'secondary', label: 'Affiliate' },
      financing_company: { variant: 'outline', label: 'Financing' },
    };
    const config = variants[type] || { variant: 'outline', label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCompany(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-muted-foreground">
            {companies?.length || 0} companies in the system
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {companies?.map((company) => (
          <Card key={company.id} className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleEdit(company)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pr-12">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getCompanyTypeBadge(company.company_type)}
                    <Badge variant={company.is_active ? 'default' : 'secondary'}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {!company.parent_company_id && (
                      <Badge variant="outline">Root</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(company.address_line1 || company.city) && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {company.address_line1}
                    {company.address_line2 && `, ${company.address_line2}`}
                    {company.city && `, ${company.city}`}
                    {company.state && `, ${company.state}`} {company.zip_code}
                  </span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>{company.email}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <span>{company.website}</span>
                </div>
              )}
              {company.data_visibility && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <span>Visibility: </span>
                  <span className="capitalize">{company.data_visibility.replace('_', ' ')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(!companies || companies.length === 0) && (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No companies found</h3>
          <p className="text-muted-foreground">No companies have been added yet.</p>
        </Card>
      )}

      <CompanyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={selectedCompany}
      />
    </div>
  );
}
