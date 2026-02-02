import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ERDPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Entity Relationship Diagram</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Visual representation of the database structure and table relationships.
        </p>
      </div>

      {/* Core Business ERD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Core Business Entities
            <Badge variant="secondary">Primary Tables</Badge>
          </CardTitle>
          <CardDescription>
            Main entities for lead-to-client conversion, services, and liabilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
            <pre className="text-xs bg-muted p-4 rounded-lg font-mono whitespace-pre overflow-x-auto">
{`
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    companies    │◄────────┤     staff       │         │   user_roles    │
├─────────────────┤   1:N   ├─────────────────┤   1:N   ├─────────────────┤
│ id (PK)         │         │ id (PK)         │◄────────┤ id (PK)         │
│ name            │         │ company_id (FK) │         │ user_id (FK)    │
│ company_type    │         │ user_id         │         │ role            │
│ parent_id (FK)  │────┐    │ first_name      │         └─────────────────┘
│ data_visibility │    │    │ last_name       │
└────────┬────────┘    │    │ department      │
         │             │    │ email           │
         │             │    └─────────────────┘
         │             │
         │ Self-ref    │
         └─────────────┘

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     leads       │────────►│    clients      │◄────────┤ client_services │
├─────────────────┤ Convert ├─────────────────┤   1:N   ├─────────────────┤
│ id (PK)         │         │ id (PK)         │ (via    │ id (PK)         │
│ company_id (FK) │         │ company_id (FK) │ junction)│ owning_co (FK) │
│ first_name      │         │ first_name      │         │ primary_client  │
│ last_name       │         │ last_name       │         │ status          │
│ email           │         │ email           │         │ service_number  │
│ phone           │         │ date_of_birth   │         │ monthly_payment │
│ status          │         │ tcpa_consent    │         │ total_debt      │
│ source          │         │ status          │         │ plan_type       │
│ interest_type   │         └────────┬────────┘         └────────┬────────┘
│ assigned_to (FK)│                  │                           │
│ converted_svc   │────────────────► │ ◄─────────────────────────┘
└─────────────────┘                  │
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
         ▼                                                       ▼
┌─────────────────┐                                   ┌─────────────────┐
│ client_phones   │                                   │client_addresses │
├─────────────────┤                                   ├─────────────────┤
│ id (PK)         │                                   │ id (PK)         │
│ client_id (FK)  │                                   │ client_id (FK)  │
│ phone_number    │                                   │ address_line1   │
│ phone_type      │                                   │ city, state     │
│ is_primary      │                                   │ is_primary      │
└─────────────────┘                                   └─────────────────┘
`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Liabilities & Settlements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Liabilities & Settlements
            <Badge variant="secondary">Debt Management</Badge>
          </CardTitle>
          <CardDescription>
            Debt tracking, creditor relationships, and settlement workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
            <pre className="text-xs bg-muted p-4 rounded-lg font-mono whitespace-pre overflow-x-auto">
{`
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   creditors     │◄────────┤   liabilities   │────────►│  settlements    │
├─────────────────┤   N:1   ├─────────────────┤   1:N   ├─────────────────┤
│ id (PK)         │         │ id (PK)         │         │ id (PK)         │
│ name            │         │ client_svc (FK) │         │ liability_id(FK)│
│ creditor_type   │         │ curr_cred (FK)  │         │ offer_amount    │
│ phone           │         │ orig_cred (FK)  │         │ offer_percent   │
│ email           │         │ liability_type  │         │ status          │
│ address         │         │ original_bal    │         │ payment_type    │
│ fax             │         │ current_bal     │         │ num_payments    │
└─────────────────┘         │ enrolled_bal    │         │ attorney_appr   │
                            │ status          │         └────────┬────────┘
                            │ priority        │                  │
                            └────────┬────────┘                  │
                                     │                           │
                                     ▼                           ▼
                            ┌─────────────────┐         ┌─────────────────┐
                            │liability_actions│         │  transactions   │
                            ├─────────────────┤         ├─────────────────┤
                            │ id (PK)         │         │ id (PK)         │
                            │ liability_id(FK)│         │ client_svc (FK) │
                            │ action_type     │         │ settlement (FK) │
                            │ description     │         │ liability (FK)  │
                            │ amount          │         │ amount          │
                            │ staff_id (FK)   │         │ type            │
                            └─────────────────┘         │ status          │
                                                        │ scheduled_date  │
                                                        └─────────────────┘
`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Litigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Litigation Management
            <Badge variant="secondary">Legal Cases</Badge>
          </CardTitle>
          <CardDescription>
            Court cases, hearings, documents, and activity tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
            <pre className="text-xs bg-muted p-4 rounded-lg font-mono whitespace-pre overflow-x-auto">
{`
┌─────────────────┐         ┌─────────────────┐
│ client_services │◄────────┤litigation_matter│
├─────────────────┤   N:1   ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ ...             │         │ client_svc (FK) │
└─────────────────┘         │ liability_id(FK)│
                            │ case_number     │
┌─────────────────┐         │ court_name      │
│   liabilities   │◄────────┤ status          │
├─────────────────┤   N:1   │ opposing_party  │
│ id (PK)         │         │ response_dead   │
│ ...             │         │ service_date    │
└─────────────────┘         └────────┬────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│litigation_docs  │         │litigation_hearin│         │litigation_activ │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │         │ id (PK)         │
│ matter_id (FK)  │         │ matter_id (FK)  │         │ matter_id (FK)  │
│ title           │         │ scheduled_date  │         │ activity_type   │
│ document_type   │         │ hearing_type    │         │ description     │
│ file_url        │         │ location        │         │ outcome         │
│ deadline_date   │         │ judge_name      │         │ staff_id (FK)   │
│ uploaded_by(FK) │         │ outcome         │         │ activity_date   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Lead Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Lead Pipeline
            <Badge variant="secondary">Sales Funnel</Badge>
          </CardTitle>
          <CardDescription>
            Lead intake, activities, debts, and conversion tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
            <pre className="text-xs bg-muted p-4 rounded-lg font-mono whitespace-pre overflow-x-auto">
{`
                            ┌─────────────────┐
                            │     leads       │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ lead_number     │
                            │ status          │────────────────────────────────┐
                            │ source          │                                │
                            │ interest_type   │                                │
                            └────────┬────────┘                                │
                                     │                                         │
         ┌───────────────────────────┼───────────────────────────┐             │
         │                           │                           │             │
         ▼                           ▼                           ▼             │
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐    │
│ lead_activities │         │   lead_debts    │         │  lead_banking   │    │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤    │
│ id (PK)         │         │ id (PK)         │         │ id (PK)         │    │
│ lead_id (FK)    │         │ lead_id (FK)    │         │ lead_id (FK)    │    │
│ activity_type   │         │ creditor_id(FK) │         │ bank_name       │    │
│ outcome         │         │ creditor_name   │         │ account_type    │    │
│ notes           │         │ current_balance │         │ routing_num     │    │
│ next_action     │         │ account_type    │         │ account_num     │    │
│ staff_id (FK)   │         │ is_enrolled     │         └─────────────────┘    │
└─────────────────┘         └─────────────────┘                                │
                                                                               │
┌─────────────────┐                                                            │
│lead_disclosures │         Lead Status Flow:                                  │
├─────────────────┤         ───────────────────────────────────────────────────┤
│ id (PK)         │         new → contacted → qualified → converted → (client)│
│ lead_id (FK)    │                               ↓                            │
│ disclosure_type │                             lost                           │
│ acknowledged_at │                                                            │
└─────────────────┘                                                            │
                                                                               │
                            ┌─────────────────┐                                │
                            │ client_services │◄───────────────────────────────┘
                            ├─────────────────┤  converted_service_id
                            │ id (PK)         │
                            │ ...             │
                            └─────────────────┘
`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Supporting Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Supporting Tables
            <Badge variant="outline">Reference Data</Badge>
          </CardTitle>
          <CardDescription>
            Tasks, assignments, communications, and documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
            <pre className="text-xs bg-muted p-4 rounded-lg font-mono whitespace-pre overflow-x-auto">
{`
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     tasks       │         │   assignments   │         │client_communic  │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │         │ id (PK)         │
│ company_id (FK) │         │ staff_id (FK)   │         │ client_id (FK)  │
│ title           │         │ entity_id       │         │ comm_type       │
│ description     │         │ entity_type     │         │ direction       │
│ status          │         │ assignment_type │         │ subject         │
│ priority        │         │ assigned_date   │         │ notes           │
│ assigned_to(FK) │         │ is_active       │         │ staff_id (FK)   │
│ entity_id       │         └─────────────────┘         │ duration_mins   │
│ entity_type     │                                     └─────────────────┘
│ due_date        │
└─────────────────┘         ┌─────────────────┐         ┌─────────────────┐
                            │client_documents │         │report_templates │
                            ├─────────────────┤         ├─────────────────┤
                            │ id (PK)         │         │ id (PK)         │
                            │ client_id (FK)  │         │ company_id (FK) │
                            │ title           │         │ name            │
                            │ document_type   │         │ module          │
                            │ file_url        │         │ config (JSONB)  │
                            │ uploaded_by(FK) │         │ is_preset       │
                            └─────────────────┘         │ is_public       │
                                                        └─────────────────┘
`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium">Symbols</div>
              <div><code className="text-xs bg-muted px-1 rounded">PK</code> - Primary Key</div>
              <div><code className="text-xs bg-muted px-1 rounded">FK</code> - Foreign Key</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Relationships</div>
              <div><code className="text-xs bg-muted px-1 rounded">1:N</code> - One to Many</div>
              <div><code className="text-xs bg-muted px-1 rounded">N:1</code> - Many to One</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Arrows</div>
              <div><code className="text-xs bg-muted px-1 rounded">──►</code> - References</div>
              <div><code className="text-xs bg-muted px-1 rounded">◄──</code> - Referenced by</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Notes</div>
              <div className="text-muted-foreground">All tables have RLS enabled</div>
              <div className="text-muted-foreground">Timestamps auto-managed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
