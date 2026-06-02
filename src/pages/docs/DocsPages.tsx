import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocsHeader } from "./DocsLayout";
import {
  DOC_SECTIONS,
  ROLES,
  TABLE_GROUPS,
  ENUMS,
  FUNCTION_GROUPS,
  EDGE_FUNCTIONS,
  FEATURES,
  FUTURE_BUILDS,
  INTEGRATIONS,
  BUCKETS,
} from "./docsData";

// ── shared bits ─────────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
      {children}
    </span>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-xs text-guardian-navy">{children}</code>;
}

// ── Overview ────────────────────────────────────────────────────────────────

export function DocsOverview() {
  const cards = DOC_SECTIONS.filter((s) => s.href !== "/docs");
  return (
    <div>
      <DocsHeader
        title="Overview"
        intro="Cornerstone is a multi-tenant case-management platform for Guardian Litigation Group. Pick a section to dig into the schema, the security model, or the product modules."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((s) => (
          <Link key={s.href} to={s.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <s.icon className="h-4 w-4 text-guardian-gold" />
                  {s.title}
                </CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── ERD ─────────────────────────────────────────────────────────────────────

export function ERDPage() {
  const flow = [
    ["leads", "the intake funnel"],
    ["clients", "a converted lead (convert_lead_to_client)"],
    ["client_services", "the engagement — debt resolution or consumer defense"],
    ["liabilities", "enrolled debts under the engagement"],
    ["settlements", "offers negotiated per liability"],
    ["litigation_matters", "defense matters when a liability is sued"],
    ["transactions", "PLSA escrow movement funding settlements"],
  ];
  return (
    <div>
      <DocsHeader
        title="Entity Relationship Diagram"
        intro="The spine of the data model. A lead converts to a client, which holds one or more engagements; each engagement enrolls liabilities, which are settled or litigated and funded through PLSA transactions."
      />
      <div className="space-y-2">
        {flow.map(([table, note], i) => (
          <div key={table} className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-guardian-navy text-xs font-semibold text-white">
              {i + 1}
            </div>
            <Card className="flex-1">
              <CardContent className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                <Mono>{table}</Mono>
                <span className="text-sm text-muted-foreground">{note}</span>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Cross-cutting tables (<Mono>tasks</Mono>, <Mono>notes</Mono>, <Mono>notifications</Mono>,{" "}
        <Mono>assignments</Mono>, <Mono>domain_events</Mono>) attach polymorphically to any of the
        above via <Mono>entity_type</Mono> / <Mono>entity_id</Mono>. See the{" "}
        <Link to="/docs/schema" className="text-guardian-gold hover:underline">
          full schema
        </Link>{" "}
        for every table.
      </p>
    </div>
  );
}

// ── Schema ──────────────────────────────────────────────────────────────────

export function SchemaPage() {
  const total = TABLE_GROUPS.reduce((n, g) => n + g.tables.length, 0);
  return (
    <div>
      <DocsHeader
        title="Database Schema"
        intro={`${total} tables across ${TABLE_GROUPS.length} domains. RLS enforces tenant isolation on all of them.`}
      />
      <div className="space-y-5">
        {TABLE_GROUPS.map((g) => (
          <Card key={g.group}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{g.group}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                {g.tables.map((t) => (
                  <div key={t.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                    <dt className="sm:w-56 sm:shrink-0">
                      <Mono>{t.name}</Mono>
                    </dt>
                    <dd className="text-sm text-muted-foreground">{t.desc}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Enums ───────────────────────────────────────────────────────────────────

export function EnumsPage() {
  return (
    <div>
      <DocsHeader
        title="Enums"
        intro={`${ENUMS.length} Postgres enum types constrain status, category, and role columns across the schema.`}
      />
      <div className="space-y-3">
        {ENUMS.map((e) => (
          <Card key={e.name}>
            <CardContent className="py-3">
              <p className="mb-1.5">
                <Mono>{e.name}</Mono>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {e.values.map((v) => (
                  <Chip key={v}>{v}</Chip>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Functions ───────────────────────────────────────────────────────────────

export function FunctionsPage() {
  return (
    <div>
      <DocsHeader
        title="Database Functions"
        intro="Postgres functions power access control, lead scoring, workflow automation, PII handling, and the multi-tenant platform. Access-control helpers run SECURITY DEFINER so RLS policies can call them safely."
      />
      <div className="space-y-5">
        {FUNCTION_GROUPS.map((g) => (
          <Card key={g.group}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{g.group}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                {g.fns.map((f) => (
                  <div key={f.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                    <dt className="sm:w-64 sm:shrink-0">
                      <Mono>{f.name}</Mono>
                    </dt>
                    <dd className="text-sm text-muted-foreground">{f.desc}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Edge functions ──────────────────────────────────────────────────────────

export function EdgeFunctionsPage() {
  const vendors = [...new Set(EDGE_FUNCTIONS.map((f) => f.vendor))];
  return (
    <div>
      <DocsHeader
        title="Edge Functions"
        intro={`${EDGE_FUNCTIONS.length} Deno edge functions bridge external vendors. They run with the service role and read vendor secrets from the Supabase function environment — never from the client.`}
      />
      <div className="space-y-5">
        {vendors.map((vendor) => (
          <Card key={vendor}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{vendor}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                {EDGE_FUNCTIONS.filter((f) => f.vendor === vendor).map((f) => (
                  <div key={f.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                    <dt className="sm:w-56 sm:shrink-0">
                      <Mono>{f.name}</Mono>
                    </dt>
                    <dd className="text-sm text-muted-foreground">{f.desc}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── RLS ─────────────────────────────────────────────────────────────────────

export function RLSPoliciesPage() {
  return (
    <div>
      <DocsHeader
        title="Row-Level Security"
        intro="Every table has RLS enabled. Policies never trust client-supplied company IDs — they resolve the caller's access server-side through SECURITY DEFINER helpers."
      />
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">The pattern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Most policies reduce to a single check:{" "}
            <Mono>can_access_company(auth.uid(), company_id)</Mono>. For tables without a direct{" "}
            <Mono>company_id</Mono>, the company is resolved through a parent (e.g. a template usage
            resolves via its <Mono>templates.company_id</Mono>).
          </p>
          <p>
            Admin-only writes add <Mono>has_role(auth.uid(), 'admin')</Mono>. Polymorphic tables use{" "}
            <Mono>resolve_entity_company_id(entity_type, entity_id)</Mono>. Cross-tenant operations
            require <Mono>is_platform_admin(auth.uid())</Mono>.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          [
            "can_access_company",
            "Is this user attached to this company? The workhorse of tenant isolation.",
          ],
          ["has_role", "Does the user hold a given app_role (e.g. admin)?"],
          ["resolve_entity_company_id", "Resolve the owning company for any polymorphic entity."],
          ["can_access_storage_object", "Path-scoped guard for the document buckets."],
          ["is_platform_admin", "Cross-tenant super-admin gate (service-role managed)."],
          ["can_view_leads", "Whether the caller may read leads at all."],
        ].map(([fn, desc]) => (
          <Card key={fn}>
            <CardContent className="py-3">
              <p className="mb-1">
                <Mono>{fn}</Mono>
              </p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        A <Mono>FOR ALL</Mono> policy's <Mono>USING</Mono> clause also governs the{" "}
        <Mono>INSERT … WITH CHECK</Mono>, so a single policy can cover read and write. See{" "}
        <Link to="/docs/permissions" className="text-guardian-gold hover:underline">
          the permissions matrix
        </Link>{" "}
        for the role-level view.
      </p>
    </div>
  );
}

// ── Permissions matrix ──────────────────────────────────────────────────────

const CAPS = ["Leads", "Clients", "Engagements", "Litigation", "Billing", "Admin"] as const;
// F = full, E = edit, V = view, "—" = none
const MATRIX: Record<string, string[]> = {
  admin: ["F", "F", "F", "F", "F", "F"],
  attorney: ["V", "E", "E", "F", "V", "—"],
  case_manager: ["V", "E", "F", "V", "V", "—"],
  paralegal: ["V", "V", "V", "E", "—", "—"],
  sales_rep: ["F", "V", "V", "—", "—", "—"],
  negotiator: ["V", "E", "E", "V", "V", "—"],
  payment_processor: ["—", "V", "V", "—", "F", "—"],
  correspondent: ["V", "E", "V", "V", "—", "—"],
  client_services_rep: ["V", "E", "E", "V", "V", "—"],
  viewer: ["V", "V", "V", "V", "V", "—"],
};
const LEGEND: Record<string, string> = {
  F: "bg-guardian-navy text-white",
  E: "bg-guardian-gold/30 text-guardian-navy",
  V: "bg-muted text-muted-foreground",
  "—": "text-muted-foreground/40",
};

export function PermissionsPage() {
  return (
    <div>
      <DocsHeader
        title="Permissions Matrix"
        intro="A summary view of what each role can do per module. This reflects the role lens and the RLS policies — F = full, E = edit, V = view-only, — = no access. The database is the source of truth."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium">Role</th>
              {CAPS.map((c) => (
                <th key={c} className="px-3 py-2 text-center font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.key} className="border-b">
                <td className="px-3 py-2">
                  <Link to={`/docs/roles/${r.key}`} className="hover:underline">
                    {r.label}
                  </Link>
                </td>
                {(MATRIX[r.key] ?? []).map((v, i) => (
                  <td key={i} className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-semibold ${LEGEND[v]}`}
                    >
                      {v}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Role guides ─────────────────────────────────────────────────────────────

export function RoleGuidePage() {
  const { role } = useParams();
  const doc = ROLES.find((r) => r.key === role) ?? ROLES[0];
  return (
    <div>
      <DocsHeader title={`${doc.label} Guide`} intro={doc.summary} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ROLES.map((r) => (
          <Link
            key={r.key}
            to={`/docs/roles/${r.key}`}
            className={`rounded-md px-2.5 py-1 text-xs ${
              r.key === doc.key
                ? "bg-guardian-navy text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Responsibilities</CardTitle>
            <CardDescription>Department: {doc.department}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {doc.responsibilities.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Primary modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {doc.modules.map((m) => (
                <Chip key={m}>{m}</Chip>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Storage ─────────────────────────────────────────────────────────────────

export function StoragePage() {
  return (
    <div>
      <DocsHeader
        title="Storage"
        intro="Documents live in private Supabase Storage buckets. Access is path-scoped: an object's first path segment resolves to a company, and can_access_storage_object enforces that the caller belongs to it."
      />
      <div className="space-y-3">
        {BUCKETS.map((b) => (
          <Card key={b.id}>
            <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <Mono>{b.id}</Mono>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {b.public ? "public" : "private"}
              </span>
              <span className="text-sm text-muted-foreground">{b.desc}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Object paths are prefixed by company, e.g. <Mono>{`{company_id}/{entity_id}/{file}`}</Mono>.
        The same <Mono>can_access_company</Mono> check that guards table rows guards files.
      </p>
    </div>
  );
}

// ── Security ────────────────────────────────────────────────────────────────

export function SecurityPage() {
  const items = [
    [
      "Authentication",
      "Google-only sign-in restricted to the @guardianlit.com domain. Sessions time out after 30 minutes of inactivity with a 2-minute warning.",
    ],
    [
      "Tenant isolation",
      "RLS on every table; company access resolved server-side via can_access_company. Cross-tenant work requires a platform admin.",
    ],
    [
      "PII encryption",
      "SSNs, lead banking, and processor credentials are encrypted at rest. Decryption goes through guarded SECURITY DEFINER functions; an assert_no_plaintext_pii trigger blocks plaintext writes.",
    ],
    [
      "Audit trail",
      "system_audit_log records sensitive operations via log_audit_event and audit triggers.",
    ],
    [
      "Rate limiting",
      "check_rate_limit applies token-bucket limits (rate_limit_counters) to sensitive endpoints.",
    ],
    [
      "Secrets",
      "Vendor API keys and the Supabase access token live as function/CI secrets, never in the repo — a check:secrets CI gate enforces it. The anon key is safe to embed; the service role key is never exposed.",
    ],
  ];
  return (
    <div>
      <DocsHeader
        title="Security"
        intro="How Cornerstone protects client data across auth, isolation, encryption, and operations."
      />
      <div className="space-y-3">
        {items.map(([title, desc]) => (
          <Card key={title}>
            <CardHeader className="pb-1">
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Feature guides ──────────────────────────────────────────────────────────

export function FeatureGuidePage() {
  const { feature } = useParams();
  const doc = FEATURES.find((f) => f.key === feature) ?? FEATURES[0];
  return (
    <div>
      <DocsHeader title={doc.label} intro={doc.summary} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FEATURES.map((f) => (
          <Link
            key={f.key}
            to={`/docs/features/${f.key}`}
            className={`rounded-md px-2.5 py-1 text-xs ${
              f.key === doc.key
                ? "bg-guardian-navy text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Typical workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
            {doc.workflow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Integrations ────────────────────────────────────────────────────────────

export function IntegrationsPage() {
  return (
    <div>
      <DocsHeader
        title="Integrations"
        intro="External vendors wired through edge functions. Each becomes live once its secrets are set in the Supabase function environment."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((it) => (
          <Card key={it.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{it.name}</CardTitle>
              <CardDescription>{it.category}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{it.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {it.secrets.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        See the{" "}
        <Link to="/docs/edge-functions" className="text-guardian-gold hover:underline">
          edge functions
        </Link>{" "}
        for the individual endpoints each integration exposes.
      </p>
    </div>
  );
}

// ── Future builds ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-guardian-gold/30 text-guardian-navy",
  blocked: "bg-destructive/10 text-destructive",
};

export function FutureBuildPage() {
  return (
    <div>
      <DocsHeader
        title="Future Builds & Roadmap"
        intro="Outstanding work and where it stands. Blocked items are waiting on external inputs (vendor keys, platform decisions, or sandbox limitations)."
      />
      <div className="space-y-3">
        {FUTURE_BUILDS.map((b) => (
          <Card key={b.title}>
            <CardContent className="py-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-medium">{b.title}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}
                >
                  {b.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{b.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
