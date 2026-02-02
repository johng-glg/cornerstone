import { DATABASE_SCHEMAS } from '@/lib/docs/schemaData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function RLSPoliciesPage() {
  const tablesWithPolicies = DATABASE_SCHEMAS.filter(s => s.rlsPolicies.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Row Level Security Policies</h1>
        <p className="text-muted-foreground mt-2">
          RLS policies control data access at the database level, ensuring multi-tenant data isolation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How RLS Works</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Row Level Security (RLS) policies are enforced at the database level for every query. 
            Each policy defines which rows a user can SELECT, INSERT, UPDATE, or DELETE.
          </p>
          <p>
            The system uses two primary security functions:
          </p>
          <ul>
            <li>
              <code>can_access_company(user_id, company_id)</code> - Checks if the user belongs to 
              the specified company or a parent company with data sharing.
            </li>
            <li>
              <code>has_role(user_id, role)</code> - Checks if the user has been assigned the 
              specified role.
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tablesWithPolicies.map((schema) => (
          <Card key={schema.name}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-4 w-4 text-primary" />
                <code>{schema.name}</code>
              </CardTitle>
              <CardDescription>{schema.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {schema.rlsPolicies.map((policy, idx) => (
                  <li 
                    key={idx} 
                    className="text-sm bg-muted/50 px-3 py-2 rounded-md font-mono"
                  >
                    {policy}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
