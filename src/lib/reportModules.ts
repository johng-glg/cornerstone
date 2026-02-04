// Report module definitions and field configurations

export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'enum' | 'boolean' | 'staff';

export interface ColumnConfig {
  key: string;
  label: string;
  type: FieldType;
  sortable?: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export interface ModuleConfig {
  module: string;
  displayName: string;
  table: string;
  columns: ColumnConfig[];
  filters: FilterConfig[];
  dateFields: string[];
  defaultColumns: string[];
  currencyFields?: string[];
}

export const FILTER_OPERATORS: Record<FieldType, { value: string; label: string }[]> = {
  text: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'ilike', label: 'Contains' },
  ],
  number: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less or Equal' },
  ],
  currency: [
    { value: 'eq', label: 'Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less or Equal' },
  ],
  date: [
    { value: 'eq', label: 'Equals' },
    { value: 'gt', label: 'After' },
    { value: 'gte', label: 'On or After' },
    { value: 'lt', label: 'Before' },
    { value: 'lte', label: 'On or Before' },
  ],
  datetime: [
    { value: 'eq', label: 'Equals' },
    { value: 'gt', label: 'After' },
    { value: 'gte', label: 'On or After' },
    { value: 'lt', label: 'Before' },
    { value: 'lte', label: 'On or Before' },
  ],
  enum: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'in', label: 'Is One Of' },
  ],
  boolean: [
    { value: 'eq', label: 'Equals' },
  ],
  staff: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'is', label: 'Is Null' },
  ],
};

export const REPORT_MODULES: ModuleConfig[] = [
  {
    module: 'leads',
    displayName: 'Leads',
    table: 'leads',
    columns: [
      { key: 'lead_number', label: 'Lead #', type: 'text', sortable: true },
      { key: 'first_name', label: 'First Name', type: 'text', sortable: true },
      { key: 'last_name', label: 'Last Name', type: 'text', sortable: true },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'source', label: 'Source', type: 'enum', sortable: true },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'interest_type', label: 'Interest Type', type: 'enum' },
      { key: 'estimated_debt_amount', label: 'Est. Debt', type: 'currency', sortable: true },
      { key: 'number_of_debts', label: '# Debts', type: 'number' },
      { key: 'assigned_to', label: 'Assigned To', type: 'staff' },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
      { key: 'contacted_at', label: 'Contacted', type: 'datetime' },
      { key: 'qualified_at', label: 'Qualified', type: 'datetime' },
      { key: 'converted_at', label: 'Converted', type: 'datetime' },
      { key: 'lost_at', label: 'Lost', type: 'datetime' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'has_active_lawsuit', label: 'Active Lawsuit', type: 'boolean' },
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'enum', options: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
      { key: 'source', label: 'Source', type: 'enum', options: ['web_form', 'phone', 'referral', 'marketing', 'partner'] },
      { key: 'interest_type', label: 'Interest Type', type: 'enum', options: ['debt_resolution', 'litigation_defense', 'both'] },
      { key: 'assigned_to', label: 'Assigned To', type: 'staff' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'has_active_lawsuit', label: 'Has Lawsuit', type: 'boolean' },
    ],
    dateFields: ['created_at', 'contacted_at', 'qualified_at', 'converted_at', 'lost_at'],
    defaultColumns: ['lead_number', 'first_name', 'last_name', 'source', 'status', 'estimated_debt_amount', 'created_at'],
    currencyFields: ['estimated_debt_amount'],
  },
  {
    module: 'clients',
    displayName: 'Clients',
    table: 'clients',
    columns: [
      { key: 'id', label: 'Client ID', type: 'text' },
      { key: 'first_name', label: 'First Name', type: 'text', sortable: true },
      { key: 'last_name', label: 'Last Name', type: 'text', sortable: true },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'is_active', label: 'Active', type: 'boolean' },
      { key: 'tcpa_consent', label: 'TCPA Consent', type: 'boolean' },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
      { key: 'updated_at', label: 'Updated', type: 'datetime' },
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'enum', options: ['active', 'inactive'] },
      { key: 'is_active', label: 'Active', type: 'boolean' },
      { key: 'tcpa_consent', label: 'TCPA Consent', type: 'boolean' },
    ],
    dateFields: ['created_at', 'updated_at', 'date_of_birth'],
    defaultColumns: ['first_name', 'last_name', 'email', 'status', 'created_at'],
  },
  {
    module: 'services',
    displayName: 'Client Services',
    table: 'client_services',
    columns: [
      { key: 'service_number', label: 'Service #', type: 'text', sortable: true },
      { key: 'primary_client_id', label: 'Client', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'plan_type', label: 'Plan Type', type: 'enum' },
      { key: 'total_enrolled_debt', label: 'Enrolled Debt', type: 'currency', sortable: true },
      { key: 'monthly_payment', label: 'Monthly Payment', type: 'currency' },
      { key: 'escrow_balance', label: 'Escrow Balance', type: 'currency' },
      { key: 'term_months', label: 'Term (Months)', type: 'number' },
      { key: 'settlement_fee_percentage', label: 'Fee %', type: 'number' },
      { key: 'enrolled_date', label: 'Enrolled', type: 'date', sortable: true },
      { key: 'program_start_date', label: 'Program Start', type: 'date' },
      { key: 'first_payment_date', label: 'First Payment', type: 'date' },
      { key: 'closed_date', label: 'Closed', type: 'date' },
      { key: 'contact_status', label: 'Contact Status', type: 'enum' },
      { key: 'payment_status', label: 'Payment Status', type: 'enum' },
      { key: 'retention_flag', label: 'Retention Flag', type: 'boolean' },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'enum', options: ['prospect', 'pending', 'active', 'paused', 'cancelled', 'completed', 'graduated'] },
      { key: 'plan_type', label: 'Plan Type', type: 'enum', options: ['glg_standard', 'glg_performance', 'glg_legal', 'custom'] },
      { key: 'contact_status', label: 'Contact Status', type: 'enum', options: ['reachable', 'unreachable', 'do_not_contact'] },
      { key: 'payment_status', label: 'Payment Status', type: 'enum', options: ['current', 'behind', 'nsf', 'paused'] },
      { key: 'retention_flag', label: 'Retention Flag', type: 'boolean' },
    ],
    dateFields: ['enrolled_date', 'program_start_date', 'first_payment_date', 'closed_date', 'created_at'],
    defaultColumns: ['service_number', 'status', 'total_enrolled_debt', 'monthly_payment', 'enrolled_date'],
    currencyFields: ['total_enrolled_debt', 'monthly_payment', 'escrow_balance'],
  },
  {
    module: 'liabilities',
    displayName: 'Liabilities',
    table: 'liabilities',
    columns: [
      { key: 'id', label: 'Liability ID', type: 'text' },
      { key: 'client_service_id', label: 'Service', type: 'text' },
      { key: 'liability_type', label: 'Type', type: 'enum', sortable: true },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'original_creditor_id', label: 'Original Creditor', type: 'text' },
      { key: 'current_creditor_id', label: 'Current Creditor', type: 'text' },
      { key: 'account_number', label: 'Account #', type: 'text' },
      { key: 'original_balance', label: 'Original Balance', type: 'currency', sortable: true },
      { key: 'enrolled_balance', label: 'Enrolled Balance', type: 'currency', sortable: true },
      { key: 'current_balance', label: 'Current Balance', type: 'currency', sortable: true },
      { key: 'priority', label: 'Priority', type: 'number' },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
    ],
    filters: [
      { key: 'liability_type', label: 'Type', type: 'enum', options: ['credit_card', 'personal_loan', 'medical', 'retail', 'auto_deficiency', 'student_loan', 'other'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['enrolled', 'in_negotiation', 'settled', 'in_litigation', 'paid_off', 'removed'] },
    ],
    dateFields: ['created_at', 'updated_at'],
    defaultColumns: ['liability_type', 'status', 'enrolled_balance', 'current_balance', 'created_at'],
    currencyFields: ['original_balance', 'enrolled_balance', 'current_balance'],
  },
  {
    module: 'settlements',
    displayName: 'Settlements',
    table: 'settlements',
    columns: [
      { key: 'id', label: 'Settlement ID', type: 'text' },
      { key: 'liability_id', label: 'Liability', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'offer_amount', label: 'Offer Amount', type: 'currency', sortable: true },
      { key: 'offer_percentage', label: 'Offer %', type: 'number', sortable: true },
      { key: 'payment_type', label: 'Payment Type', type: 'enum' },
      { key: 'number_of_payments', label: '# Payments', type: 'number' },
      { key: 'first_payment_date', label: 'First Payment', type: 'date' },
      { key: 'offered_date', label: 'Offered', type: 'date', sortable: true },
      { key: 'accepted_date', label: 'Accepted', type: 'date' },
      { key: 'completed_date', label: 'Completed', type: 'date' },
      { key: 'attorney_approved', label: 'Attorney Approved', type: 'boolean' },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'enum', options: ['offered', 'accepted', 'rejected', 'countered', 'completed', 'cancelled'] },
      { key: 'payment_type', label: 'Payment Type', type: 'enum', options: ['lump_sum', 'payment_plan'] },
      { key: 'attorney_approved', label: 'Attorney Approved', type: 'boolean' },
    ],
    dateFields: ['offered_date', 'accepted_date', 'completed_date', 'first_payment_date', 'created_at'],
    defaultColumns: ['status', 'offer_amount', 'offer_percentage', 'payment_type', 'offered_date', 'accepted_date'],
    currencyFields: ['offer_amount'],
  },
  {
    module: 'transactions',
    displayName: 'Transactions',
    table: 'transactions',
    columns: [
      { key: 'id', label: 'Transaction ID', type: 'text' },
      { key: 'client_service_id', label: 'Service', type: 'text' },
      { key: 'transaction_type', label: 'Type', type: 'enum', sortable: true },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
      { key: 'scheduled_date', label: 'Scheduled', type: 'date', sortable: true },
      { key: 'processed_at', label: 'Processed', type: 'datetime' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'settlement_id', label: 'Settlement', type: 'text' },
      { key: 'liability_id', label: 'Liability', type: 'text' },
      { key: 'external_id', label: 'External ID', type: 'text' },
      { key: 'error_message', label: 'Error', type: 'text' },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
    ],
    filters: [
      { key: 'transaction_type', label: 'Type', type: 'enum', options: ['escrow_deposit', 'settlement_payment', 'contingency_fee', 'service_fee', 'refund', 'nsf_fee'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['pending', 'scheduled', 'processing', 'cleared', 'failed', 'cancelled', 'refunded'] },
    ],
    dateFields: ['scheduled_date', 'processed_at', 'created_at'],
    defaultColumns: ['transaction_type', 'status', 'amount', 'scheduled_date', 'processed_at'],
    currencyFields: ['amount'],
  },
  {
    module: 'litigation',
    displayName: 'Litigation Matters',
    table: 'litigation_matters',
    columns: [
      { key: 'id', label: 'Matter ID', type: 'text' },
      { key: 'client_service_id', label: 'Service', type: 'text' },
      { key: 'liability_id', label: 'Liability', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'case_number', label: 'Case #', type: 'text' },
      { key: 'court_name', label: 'Court', type: 'text' },
      { key: 'county', label: 'County', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'opposing_party', label: 'Opposing Party', type: 'text' },
      { key: 'opposing_counsel', label: 'Opposing Counsel', type: 'text' },
      { key: 'service_date', label: 'Service Date', type: 'date' },
      { key: 'response_deadline', label: 'Response Deadline', type: 'date', sortable: true },
      { key: 'next_hearing_date', label: 'Next Hearing', type: 'datetime' },
      { key: 'judgment_amount', label: 'Judgment', type: 'currency' },
      { key: 'settlement_amount', label: 'Settlement', type: 'currency' },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'enum', options: ['new', 'answer_filed', 'discovery', 'motion_pending', 'trial_scheduled', 'settled', 'judgment', 'dismissed', 'closed'] },
      { key: 'state', label: 'State', type: 'text' },
    ],
    dateFields: ['service_date', 'response_deadline', 'next_hearing_date', 'created_at'],
    defaultColumns: ['case_number', 'status', 'court_name', 'opposing_party', 'response_deadline'],
    currencyFields: ['judgment_amount', 'settlement_amount'],
  },
  {
    module: 'billing',
    displayName: 'Billing Entries',
    table: 'billing_entries',
    columns: [
      { key: 'id', label: 'Entry ID', type: 'text' },
      { key: 'staff_id', label: 'Attorney', type: 'staff', sortable: true },
      { key: 'client_id', label: 'Client', type: 'text' },
      { key: 'litigation_matter_id', label: 'Matter', type: 'text' },
      { key: 'entry_type', label: 'Type', type: 'enum', sortable: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'billing_date', label: 'Date', type: 'date', sortable: true },
      { key: 'duration_minutes', label: 'Duration (min)', type: 'number' },
      { key: 'hourly_rate', label: 'Hourly Rate', type: 'currency' },
      { key: 'expense_amount', label: 'Expense Amount', type: 'currency' },
      { key: 'total_amount', label: 'Total', type: 'currency', sortable: true },
      { key: 'is_billable', label: 'Billable', type: 'boolean' },
      { key: 'status', label: 'Status', type: 'enum', sortable: true },
      { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
    ],
    filters: [
      { key: 'entry_type', label: 'Type', type: 'enum', options: ['time', 'expense'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['draft', 'approved', 'invoiced', 'paid'] },
      { key: 'is_billable', label: 'Billable', type: 'boolean' },
      { key: 'staff_id', label: 'Attorney', type: 'staff' },
    ],
    dateFields: ['billing_date', 'created_at'],
    defaultColumns: ['billing_date', 'entry_type', 'description', 'staff_id', 'total_amount', 'status'],
    currencyFields: ['hourly_rate', 'expense_amount', 'total_amount'],
  },
];

export function getModuleConfig(moduleKey: string): ModuleConfig | undefined {
  return REPORT_MODULES.find(m => m.module === moduleKey);
}

export function getColumnLabel(moduleKey: string, columnKey: string): string {
  const module = getModuleConfig(moduleKey);
  if (!module) return columnKey;
  const column = module.columns.find(c => c.key === columnKey);
  return column?.label ?? columnKey;
}

export function getFilterOperators(fieldType: FieldType): { value: string; label: string }[] {
  return FILTER_OPERATORS[fieldType] || FILTER_OPERATORS.text;
}

export function getChartTypes(): { value: string; label: string }[] {
  return [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'area', label: 'Area Chart' },
  ];
}
