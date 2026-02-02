// Database schema documentation

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  description: string;
}

export interface TableSchema {
  name: string;
  description: string;
  columns: ColumnDef[];
  rlsPolicies: string[];
  relationships: string[];
}

export const DATABASE_SCHEMAS: TableSchema[] = [
  {
    name: 'leads',
    description: 'Stores potential client leads from various sources. Tracks lead status through the sales pipeline from initial contact to conversion.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'lead_number', type: 'text', nullable: false, description: 'Auto-generated lead identifier (LEAD-YYYY-XXXX)' },
      { name: 'first_name', type: 'text', nullable: false, description: 'Lead first name' },
      { name: 'last_name', type: 'text', nullable: false, description: 'Lead last name' },
      { name: 'email', type: 'text', nullable: true, description: 'Contact email address' },
      { name: 'phone', type: 'text', nullable: true, description: 'Contact phone number' },
      { name: 'status', type: 'lead_status', nullable: false, default: 'new', description: 'Current pipeline status: new, contacted, qualified, converted, lost' },
      { name: 'source', type: 'lead_source', nullable: false, default: 'web_form', description: 'Lead acquisition source' },
      { name: 'interest_type', type: 'lead_interest', nullable: false, default: 'debt_resolution', description: 'Type of service interest' },
      { name: 'estimated_debt_amount', type: 'numeric', nullable: true, description: 'Estimated total debt amount' },
      { name: 'assigned_to', type: 'uuid', nullable: true, description: 'Staff member assigned to this lead' },
      { name: 'company_id', type: 'uuid', nullable: false, description: 'Company that owns this lead' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Record creation timestamp' },
      { name: 'converted_at', type: 'timestamptz', nullable: true, description: 'Timestamp when lead converted to client' },
      { name: 'has_active_lawsuit', type: 'boolean', nullable: true, default: 'false', description: 'Whether lead has active litigation' },
      { name: 'wizard_step', type: 'integer', nullable: true, default: '1', description: 'Current enrollment wizard step' },
      { name: 'wizard_data', type: 'jsonb', nullable: true, default: '{}', description: 'Stored wizard form data' },
    ],
    rlsPolicies: [
      'Staff can view company leads - SELECT using can_access_company(auth.uid(), company_id)',
      'Staff can manage company leads - ALL using can_access_company(auth.uid(), company_id)',
    ],
    relationships: [
      'company_id -> companies.id',
      'assigned_to -> staff.id',
      'converted_service_id -> client_services.id',
    ],
  },
  {
    name: 'clients',
    description: 'Core client records containing personal information and contact preferences. Linked to services through client_service_clients.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'first_name', type: 'text', nullable: false, description: 'Client first name' },
      { name: 'last_name', type: 'text', nullable: false, description: 'Client last name' },
      { name: 'middle_name', type: 'text', nullable: true, description: 'Client middle name' },
      { name: 'email', type: 'text', nullable: true, description: 'Primary email address' },
      { name: 'date_of_birth', type: 'date', nullable: true, description: 'Date of birth for verification' },
      { name: 'ssn_encrypted', type: 'text', nullable: true, description: 'Encrypted Social Security Number' },
      { name: 'status', type: 'client_status_enum', nullable: true, default: 'inactive', description: 'Active/inactive based on services' },
      { name: 'company_id', type: 'uuid', nullable: false, description: 'Company that manages this client' },
      { name: 'tcpa_consent', type: 'boolean', nullable: true, default: 'false', description: 'TCPA communication consent' },
      { name: 'preferred_contact_method', type: 'phone_type', nullable: true, default: 'mobile', description: 'Preferred contact method' },
      { name: 'is_active', type: 'boolean', nullable: false, default: 'true', description: 'Soft delete flag' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Record creation timestamp' },
    ],
    rlsPolicies: [
      'Staff can view company clients - SELECT using can_access_company(auth.uid(), company_id)',
      'Staff can manage company clients - ALL using can_access_company(auth.uid(), company_id)',
    ],
    relationships: [
      'company_id -> companies.id',
    ],
  },
  {
    name: 'client_services',
    description: 'Represents an active service engagement (debt settlement program). Links clients to their enrolled services with financial details.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'service_number', type: 'text', nullable: false, description: 'Auto-generated service identifier (SVC-YYYY-XXXX)' },
      { name: 'primary_client_id', type: 'uuid', nullable: true, description: 'Primary client on the service' },
      { name: 'owning_company_id', type: 'uuid', nullable: false, description: 'Company managing this service' },
      { name: 'status', type: 'service_status', nullable: false, default: 'prospect', description: 'Service lifecycle status' },
      { name: 'plan_type', type: 'plan_type', nullable: true, default: 'glg_standard', description: 'Service plan tier' },
      { name: 'total_enrolled_debt', type: 'numeric', nullable: true, default: '0', description: 'Total debt amount enrolled' },
      { name: 'monthly_payment', type: 'numeric', nullable: true, description: 'Monthly escrow payment amount' },
      { name: 'escrow_balance', type: 'numeric', nullable: true, default: '0', description: 'Current escrow account balance' },
      { name: 'settlement_fee_percentage', type: 'numeric', nullable: true, default: '25', description: 'Fee percentage on settlements' },
      { name: 'term_months', type: 'integer', nullable: true, description: 'Program duration in months' },
      { name: 'enrolled_date', type: 'date', nullable: true, description: 'Service enrollment date' },
      { name: 'first_payment_date', type: 'date', nullable: true, description: 'First scheduled payment date' },
      { name: 'contact_status', type: 'contact_status_enum', nullable: true, default: 'reachable', description: 'Client reachability status' },
      { name: 'payment_status', type: 'payment_status_enum', nullable: true, description: 'Payment health status' },
      { name: 'retention_flag', type: 'boolean', nullable: true, default: 'false', description: 'Flagged for retention team' },
      { name: 'retention_type', type: 'retention_type_enum', nullable: true, description: 'Type of retention issue' },
    ],
    rlsPolicies: [
      'Staff can view company client_services - SELECT using can_access_company(auth.uid(), owning_company_id)',
      'Staff can manage company client_services - ALL using can_access_company(auth.uid(), owning_company_id)',
    ],
    relationships: [
      'owning_company_id -> companies.id',
      'primary_client_id -> clients.id',
      'originating_company_id -> companies.id',
    ],
  },
  {
    name: 'liabilities',
    description: 'Individual debt accounts enrolled in a client service. Tracks creditor information and balance changes through the settlement process.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'client_service_id', type: 'uuid', nullable: false, description: 'Parent service record' },
      { name: 'original_creditor_id', type: 'uuid', nullable: true, description: 'Original creditor reference' },
      { name: 'current_creditor_id', type: 'uuid', nullable: true, description: 'Current creditor (may differ from original)' },
      { name: 'debt_buyer_id', type: 'uuid', nullable: true, description: 'Debt buyer if account was sold' },
      { name: 'law_firm_id', type: 'uuid', nullable: true, description: 'Collection law firm if applicable' },
      { name: 'liability_type', type: 'liability_type', nullable: false, default: 'credit_card', description: 'Type of debt account' },
      { name: 'account_number', type: 'text', nullable: true, description: 'Account number (masked)' },
      { name: 'original_balance', type: 'numeric', nullable: true, description: 'Balance when account opened' },
      { name: 'enrolled_balance', type: 'numeric', nullable: true, description: 'Balance when enrolled in program' },
      { name: 'current_balance', type: 'numeric', nullable: true, description: 'Current balance with interest/fees' },
      { name: 'status', type: 'liability_status', nullable: false, default: 'enrolled', description: 'Settlement pipeline status' },
      { name: 'priority', type: 'integer', nullable: true, default: '0', description: 'Settlement priority order' },
    ],
    rlsPolicies: [
      'Staff can access liabilities - ALL using EXISTS (SELECT 1 FROM client_services cs WHERE cs.id = client_service_id AND can_access_company(auth.uid(), cs.owning_company_id))',
    ],
    relationships: [
      'client_service_id -> client_services.id',
      'original_creditor_id -> creditors.id',
      'current_creditor_id -> creditors.id',
      'debt_buyer_id -> creditors.id',
      'law_firm_id -> creditors.id',
    ],
  },
  {
    name: 'settlements',
    description: 'Settlement offers and negotiations for liabilities. Tracks offer amounts, payment schedules, and attorney approvals.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'liability_id', type: 'uuid', nullable: false, description: 'Liability being settled' },
      { name: 'offer_amount', type: 'numeric', nullable: false, description: 'Settlement offer amount' },
      { name: 'offer_percentage', type: 'numeric', nullable: true, description: 'Settlement as percentage of balance' },
      { name: 'status', type: 'settlement_status', nullable: false, default: 'offered', description: 'Offer status: offered, accepted, rejected, completed' },
      { name: 'payment_type', type: 'payment_type', nullable: false, default: 'lump_sum', description: 'Lump sum or payment plan' },
      { name: 'number_of_payments', type: 'integer', nullable: true, default: '1', description: 'Number of settlement payments' },
      { name: 'first_payment_date', type: 'date', nullable: true, description: 'First settlement payment date' },
      { name: 'payment_schedule', type: 'jsonb', nullable: true, default: '[]', description: 'Payment schedule details' },
      { name: 'offered_date', type: 'date', nullable: false, default: 'CURRENT_DATE', description: 'Date offer was made' },
      { name: 'accepted_date', type: 'date', nullable: true, description: 'Date offer was accepted' },
      { name: 'completed_date', type: 'date', nullable: true, description: 'Date settlement was completed' },
      { name: 'attorney_approved', type: 'boolean', nullable: true, default: 'false', description: 'Attorney approval status' },
      { name: 'attorney_approved_by', type: 'uuid', nullable: true, description: 'Approving attorney' },
      { name: 'fee_collection_method', type: 'fee_collection_method', nullable: true, default: 'split', description: 'How fees are collected' },
    ],
    rlsPolicies: [
      'Staff can access settlements - ALL using EXISTS (SELECT 1 FROM liabilities l JOIN client_services cs ON cs.id = l.client_service_id WHERE l.id = liability_id AND can_access_company(auth.uid(), cs.owning_company_id))',
    ],
    relationships: [
      'liability_id -> liabilities.id',
      'attorney_approved_by -> staff.id',
    ],
  },
  {
    name: 'litigation_matters',
    description: 'Legal cases arising from debt collection. Tracks court information, deadlines, and case outcomes.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'liability_id', type: 'uuid', nullable: false, description: 'Related liability' },
      { name: 'client_service_id', type: 'uuid', nullable: false, description: 'Parent service' },
      { name: 'case_number', type: 'text', nullable: true, description: 'Court case number' },
      { name: 'court_name', type: 'text', nullable: true, description: 'Court name' },
      { name: 'state', type: 'text', nullable: true, description: 'State where filed' },
      { name: 'county', type: 'text', nullable: true, description: 'County where filed' },
      { name: 'status', type: 'litigation_status', nullable: false, default: 'new', description: 'Case status' },
      { name: 'opposing_party', type: 'text', nullable: true, description: 'Plaintiff/creditor name' },
      { name: 'opposing_counsel', type: 'text', nullable: true, description: 'Opposing attorney' },
      { name: 'service_date', type: 'date', nullable: true, description: 'Date served with lawsuit' },
      { name: 'response_deadline', type: 'date', nullable: true, description: 'Answer/response deadline' },
      { name: 'next_hearing_date', type: 'timestamptz', nullable: true, description: 'Next scheduled hearing' },
      { name: 'judgment_amount', type: 'numeric', nullable: true, description: 'Judgment amount if entered' },
      { name: 'settlement_amount', type: 'numeric', nullable: true, description: 'Settlement amount if resolved' },
    ],
    rlsPolicies: [
      'Staff can access litigation matters - ALL using EXISTS (SELECT 1 FROM client_services cs WHERE cs.id = client_service_id AND can_access_company(auth.uid(), cs.owning_company_id))',
    ],
    relationships: [
      'liability_id -> liabilities.id',
      'client_service_id -> client_services.id',
    ],
  },
  {
    name: 'transactions',
    description: 'All financial transactions including escrow deposits, settlement payments, and fee collections.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'client_service_id', type: 'uuid', nullable: false, description: 'Related service' },
      { name: 'liability_id', type: 'uuid', nullable: true, description: 'Related liability if applicable' },
      { name: 'settlement_id', type: 'uuid', nullable: true, description: 'Related settlement if applicable' },
      { name: 'transaction_type', type: 'text', nullable: false, description: 'Type: escrow_deposit, settlement_payment, contingency_fee, service_fee' },
      { name: 'amount', type: 'numeric', nullable: false, description: 'Transaction amount' },
      { name: 'status', type: 'text', nullable: false, default: 'pending', description: 'pending, processed, failed, cancelled' },
      { name: 'scheduled_date', type: 'date', nullable: true, description: 'Scheduled processing date' },
      { name: 'processed_at', type: 'timestamptz', nullable: true, description: 'Actual processing timestamp' },
      { name: 'processor_id', type: 'uuid', nullable: true, description: 'Payment processor used' },
      { name: 'external_id', type: 'text', nullable: true, description: 'External processor reference' },
      { name: 'error_message', type: 'text', nullable: true, description: 'Error details if failed' },
      { name: 'parent_transaction_id', type: 'uuid', nullable: true, description: 'Parent for split payments' },
      { name: 'sequence_number', type: 'integer', nullable: true, description: 'Payment sequence in series' },
    ],
    rlsPolicies: [
      'Staff can access transactions - ALL using EXISTS (SELECT 1 FROM client_services cs WHERE cs.id = client_service_id AND can_access_company(auth.uid(), cs.owning_company_id))',
    ],
    relationships: [
      'client_service_id -> client_services.id',
      'liability_id -> liabilities.id',
      'settlement_id -> settlements.id',
      'processor_id -> payment_processors.id',
      'parent_transaction_id -> transactions.id',
    ],
  },
  {
    name: 'tasks',
    description: 'Task management for staff workflow. Supports linking to any entity type for context.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'title', type: 'text', nullable: false, description: 'Task title' },
      { name: 'description', type: 'text', nullable: true, description: 'Detailed description' },
      { name: 'task_type', type: 'task_type', nullable: false, default: 'general', description: 'Task category' },
      { name: 'status', type: 'task_status', nullable: false, default: 'pending', description: 'pending, in_progress, completed, cancelled' },
      { name: 'priority', type: 'task_priority', nullable: false, default: 'medium', description: 'low, medium, high, urgent' },
      { name: 'due_date', type: 'timestamptz', nullable: true, description: 'Task due date' },
      { name: 'assigned_to', type: 'uuid', nullable: true, description: 'Assigned staff member' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'Staff who created task' },
      { name: 'company_id', type: 'uuid', nullable: false, description: 'Company ownership' },
      { name: 'entity_type', type: 'entity_type', nullable: true, description: 'Type of linked entity' },
      { name: 'entity_id', type: 'uuid', nullable: true, description: 'ID of linked entity' },
      { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'Completion timestamp' },
    ],
    rlsPolicies: [
      'Staff can view company tasks - SELECT using can_access_company(auth.uid(), company_id)',
      'Staff can manage company tasks - ALL using can_access_company(auth.uid(), company_id)',
    ],
    relationships: [
      'company_id -> companies.id',
      'assigned_to -> staff.id',
      'created_by -> staff.id',
    ],
  },
  {
    name: 'staff',
    description: 'Staff member profiles linked to auth users. Contains department and role information.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'user_id', type: 'uuid', nullable: false, description: 'Auth user reference' },
      { name: 'company_id', type: 'uuid', nullable: false, description: 'Company employment' },
      { name: 'first_name', type: 'text', nullable: false, description: 'Staff first name' },
      { name: 'last_name', type: 'text', nullable: false, description: 'Staff last name' },
      { name: 'email', type: 'text', nullable: false, description: 'Work email' },
      { name: 'phone', type: 'text', nullable: true, description: 'Work phone' },
      { name: 'department', type: 'department_enum', nullable: false, description: 'Department assignment' },
      { name: 'job_title', type: 'text', nullable: true, description: 'Job title' },
      { name: 'avatar_url', type: 'text', nullable: true, description: 'Profile avatar URL' },
      { name: 'is_active', type: 'boolean', nullable: false, default: 'true', description: 'Active employment status' },
    ],
    rlsPolicies: [
      'Staff can view accessible staff - SELECT using can_access_company(auth.uid(), company_id)',
      'Staff can update own profile - UPDATE using user_id = auth.uid()',
    ],
    relationships: [
      'company_id -> companies.id',
      'user_id -> auth.users.id',
    ],
  },
  {
    name: 'companies',
    description: 'Company/organization records. Supports parent-child relationships for franchise structures.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'name', type: 'text', nullable: false, description: 'Company name' },
      { name: 'company_type', type: 'company_type', nullable: false, default: 'law_firm', description: 'Organization type' },
      { name: 'parent_company_id', type: 'uuid', nullable: true, description: 'Parent company for subsidiaries' },
      { name: 'data_visibility', type: 'data_visibility', nullable: false, default: 'own_only', description: 'Data sharing level' },
      { name: 'address_line1', type: 'text', nullable: true, description: 'Street address' },
      { name: 'city', type: 'text', nullable: true, description: 'City' },
      { name: 'state', type: 'text', nullable: true, description: 'State' },
      { name: 'zip_code', type: 'text', nullable: true, description: 'ZIP code' },
      { name: 'phone', type: 'text', nullable: true, description: 'Main phone' },
      { name: 'email', type: 'text', nullable: true, description: 'Main email' },
      { name: 'website', type: 'text', nullable: true, description: 'Company website' },
      { name: 'settings', type: 'jsonb', nullable: true, default: '{}', description: 'Company-specific settings' },
      { name: 'is_active', type: 'boolean', nullable: false, default: 'true', description: 'Active status' },
    ],
    rlsPolicies: [
      'Staff can view accessible companies - SELECT using can_access_company(auth.uid(), id)',
      'Admins can manage companies - ALL using has_role(auth.uid(), \'admin\')',
    ],
    relationships: [
      'parent_company_id -> companies.id',
    ],
  },
  {
    name: 'creditors',
    description: 'Master list of creditors, debt buyers, and collection law firms for reference across liabilities.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'name', type: 'text', nullable: false, description: 'Creditor name' },
      { name: 'creditor_type', type: 'creditor_type', nullable: false, default: 'original_creditor', description: 'original_creditor, debt_buyer, collection_agency, law_firm' },
      { name: 'phone', type: 'text', nullable: true, description: 'Contact phone' },
      { name: 'fax', type: 'text', nullable: true, description: 'Fax number' },
      { name: 'email', type: 'text', nullable: true, description: 'Contact email' },
      { name: 'address_line1', type: 'text', nullable: true, description: 'Street address' },
      { name: 'city', type: 'text', nullable: true, description: 'City' },
      { name: 'state', type: 'text', nullable: true, description: 'State' },
      { name: 'zip_code', type: 'text', nullable: true, description: 'ZIP code' },
      { name: 'notes', type: 'text', nullable: true, description: 'Internal notes' },
      { name: 'is_active', type: 'boolean', nullable: false, default: 'true', description: 'Active in system' },
    ],
    rlsPolicies: [
      'All staff can view creditors - SELECT using true',
      'Admins can manage creditors - ALL using has_role(auth.uid(), \'admin\')',
    ],
    relationships: [],
  },
  {
    name: 'report_templates',
    description: 'Saved report configurations for quick re-run. Includes system presets and user-created templates.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'company_id', type: 'uuid', nullable: true, description: 'Company ownership (null for presets)' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'Creating staff member' },
      { name: 'name', type: 'text', nullable: false, description: 'Template name' },
      { name: 'description', type: 'text', nullable: true, description: 'Template description' },
      { name: 'module', type: 'text', nullable: false, description: 'Source data module' },
      { name: 'config', type: 'jsonb', nullable: false, default: '{}', description: 'Report configuration: columns, filters, chart settings' },
      { name: 'is_preset', type: 'boolean', nullable: false, default: 'false', description: 'System preset flag' },
      { name: 'is_public', type: 'boolean', nullable: false, default: 'false', description: 'Shared with company' },
    ],
    rlsPolicies: [
      'Staff can access company report templates - ALL using (company_id IS NULL AND is_preset = true) OR can_access_company(auth.uid(), company_id)',
    ],
    relationships: [
      'company_id -> companies.id',
      'created_by -> staff.id',
    ],
  },
];

export const ENUM_DEFINITIONS = [
  {
    name: 'lead_status',
    values: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    description: 'Lead pipeline stages',
  },
  {
    name: 'lead_source',
    values: ['web_form', 'phone', 'referral', 'marketing', 'partner'],
    description: 'Lead acquisition channels',
  },
  {
    name: 'service_status',
    values: ['prospect', 'pending_docs', 'pending_payment', 'active', 'paused', 'graduated', 'cancelled', 'terminated'],
    description: 'Service lifecycle stages',
  },
  {
    name: 'liability_status',
    values: ['enrolled', 'negotiating', 'offer_pending', 'settled', 'paid_off', 'litigation', 'removed'],
    description: 'Liability settlement pipeline',
  },
  {
    name: 'settlement_status',
    values: ['offered', 'counter_offered', 'accepted', 'rejected', 'in_progress', 'completed', 'defaulted'],
    description: 'Settlement offer states',
  },
  {
    name: 'litigation_status',
    values: ['new', 'served', 'answer_filed', 'discovery', 'mediation', 'trial', 'judgment', 'settled', 'dismissed', 'closed'],
    description: 'Litigation case stages',
  },
  {
    name: 'task_status',
    values: ['pending', 'in_progress', 'completed', 'cancelled'],
    description: 'Task completion states',
  },
  {
    name: 'task_priority',
    values: ['low', 'medium', 'high', 'urgent'],
    description: 'Task priority levels',
  },
  {
    name: 'app_role',
    values: ['admin', 'attorney', 'case_manager', 'negotiator', 'sales_rep', 'client_services_rep', 'payment_processor', 'correspondence'],
    description: 'Application user roles',
  },
  {
    name: 'department_enum',
    values: ['admin', 'sales', 'client_services', 'legal', 'case_management', 'negotiations', 'payment_processing', 'correspondence'],
    description: 'Staff department assignments',
  },
  {
    name: 'creditor_type',
    values: ['original_creditor', 'debt_buyer', 'collection_agency', 'law_firm'],
    description: 'Types of creditor entities',
  },
  {
    name: 'liability_type',
    values: ['credit_card', 'personal_loan', 'medical', 'auto_deficiency', 'private_student_loan', 'business_debt', 'other'],
    description: 'Types of debt accounts',
  },
];

export const DATABASE_FUNCTIONS = [
  {
    name: 'can_access_company',
    signature: 'can_access_company(_user_id uuid, _company_id uuid) RETURNS boolean',
    description: 'Checks if a user has access to a company based on their staff record. Used in RLS policies for multi-tenant data isolation.',
    securityDefiner: true,
  },
  {
    name: 'has_role',
    signature: 'has_role(_user_id uuid, _role app_role) RETURNS boolean',
    description: 'Checks if a user has a specific role assigned. Used for role-based access control in RLS policies.',
    securityDefiner: true,
  },
  {
    name: 'get_user_company_id',
    signature: 'get_user_company_id(_user_id uuid) RETURNS uuid',
    description: 'Returns the company ID for a given user based on their staff record.',
    securityDefiner: true,
  },
  {
    name: 'generate_lead_number',
    signature: 'generate_lead_number() RETURNS trigger',
    description: 'Trigger function that auto-generates lead numbers in format LEAD-YYYY-XXXX.',
    securityDefiner: false,
  },
  {
    name: 'generate_service_number',
    signature: 'generate_service_number() RETURNS trigger',
    description: 'Trigger function that auto-generates service numbers in format SVC-YYYY-XXXX.',
    securityDefiner: false,
  },
  {
    name: 'update_client_status',
    signature: 'update_client_status() RETURNS trigger',
    description: 'Trigger function that updates client status based on their active services.',
    securityDefiner: true,
  },
  {
    name: 'track_lead_status_transition',
    signature: 'track_lead_status_transition() RETURNS trigger',
    description: 'Trigger function that records timestamps when lead status changes.',
    securityDefiner: false,
  },
];

export const EDGE_FUNCTIONS = [
  {
    name: 'create-staff-user',
    path: 'supabase/functions/create-staff-user',
    description: 'Creates a new staff user with auth credentials and staff profile. Called during staff onboarding.',
    authentication: 'Service role (no JWT verification)',
    inputs: [
      { name: 'email', type: 'string', description: 'User email address' },
      { name: 'password', type: 'string', description: 'Initial password' },
      { name: 'first_name', type: 'string', description: 'Staff first name' },
      { name: 'last_name', type: 'string', description: 'Staff last name' },
      { name: 'company_id', type: 'string', description: 'Company UUID' },
      { name: 'department', type: 'string', description: 'Department enum value' },
      { name: 'role', type: 'string', description: 'App role to assign' },
    ],
    outputs: 'Created user and staff record',
  },
];

export const STORAGE_BUCKETS = [
  {
    name: 'litigation-documents',
    isPublic: true,
    description: 'Stores litigation-related documents: court filings, summons, answers, motions.',
    policies: [
      'Authenticated users can upload to their company folder',
      'Staff can view documents for their company cases',
    ],
  },
  {
    name: 'client-documents',
    isPublic: true,
    description: 'Stores client documents: IDs, contracts, disclosures, correspondence.',
    policies: [
      'Authenticated users can upload to their company folder',
      'Staff can view documents for their company clients',
    ],
  },
];
