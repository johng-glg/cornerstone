import { Building2, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStaff } from '@/hooks/useStaff';

export function CompanySettingsTab() {
  const { data: staff } = useCurrentStaff();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', staff?.company_id],
    queryFn: async () => {
      if (!staff?.company_id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', staff.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!staff?.company_id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to load company information.
        </CardContent>
      </Card>
    );
  }

  const formatAddress = () => {
    const parts = [
      company.address_line1,
      company.address_line2,
      company.city && company.state
        ? `${company.city}, ${company.state} ${company.zip_code || ''}`
        : company.city || company.state,
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>View your organization details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{company.name}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {company.company_type.replace('_', ' ')}
              </p>
            </div>
          </div>

          {company.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <a
                href={`mailto:${company.email}`}
                className="text-sm hover:underline"
              >
                {company.email}
              </a>
            </div>
          )}

          {company.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <a
                href={`tel:${company.phone}`}
                className="text-sm hover:underline"
              >
                {company.phone}
              </a>
            </div>
          )}

          {company.website && (
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline"
              >
                {company.website}
              </a>
            </div>
          )}

          {(company.address_line1 || company.city) && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm">{formatAddress()}</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Contact your administrator to update company information.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
