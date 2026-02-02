// Template type enums
export type TemplateType = 'email' | 'sms' | 'document';
export type TemplateLanguage = 'en' | 'es';

// Merge field definition
export interface MergeFieldDefinition {
  entity: string;
  field: string;
  label: string;
  description?: string;
  sampleValue?: string;
}

// Conditional clause definition
export interface ConditionalClause {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean;
  content: string;
  elseContent?: string;
}

// Template category type
export interface TemplateCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  template_type: TemplateType | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type TemplateCategoryInsert = Omit<TemplateCategory, 'id' | 'created_at' | 'updated_at'>;
export type TemplateCategoryUpdate = Partial<TemplateCategoryInsert> & { id: string };

// Template type
export interface Template {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  template_type: TemplateType;
  subject: string | null;
  content: string;
  content_html: string | null;
  merge_fields: MergeFieldDefinition[];
  conditional_clauses: ConditionalClause[];
  is_active: boolean;
  is_system: boolean;
  language: TemplateLanguage;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  current_version: number;
  // Joined data
  category?: TemplateCategory | null;
  creator?: { first_name: string; last_name: string } | null;
}

export type TemplateInsert = Omit<Template, 'id' | 'created_at' | 'updated_at' | 'current_version' | 'category' | 'creator'>;
export type TemplateUpdate = Partial<Omit<TemplateInsert, 'company_id' | 'is_system'>> & { id: string };

// Template version type
export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  content: string;
  content_html: string | null;
  subject: string | null;
  created_by: string | null;
  created_at: string;
  change_notes: string | null;
  // Joined data
  creator?: { first_name: string; last_name: string } | null;
}

// Template usage type
export interface TemplateUsage {
  id: string;
  template_id: string;
  entity_type: string;
  entity_id: string;
  used_by: string | null;
  used_at: string;
  channel: string | null;
  success: boolean;
  error_message: string | null;
}

// Merge field registry - defines all available merge fields by entity
export const MERGE_FIELD_REGISTRY: Record<string, MergeFieldDefinition[]> = {
  lead: [
    { entity: 'lead', field: 'first_name', label: 'First Name', sampleValue: 'John' },
    { entity: 'lead', field: 'last_name', label: 'Last Name', sampleValue: 'Smith' },
    { entity: 'lead', field: 'full_name', label: 'Full Name', sampleValue: 'John Smith' },
    { entity: 'lead', field: 'email', label: 'Email', sampleValue: 'john.smith@email.com' },
    { entity: 'lead', field: 'phone', label: 'Phone', sampleValue: '(555) 123-4567' },
    { entity: 'lead', field: 'lead_number', label: 'Lead Number', sampleValue: 'LEAD-2026-0001' },
    { entity: 'lead', field: 'estimated_debt', label: 'Estimated Debt', sampleValue: '$25,000' },
    { entity: 'lead', field: 'status', label: 'Status', sampleValue: 'Qualified' },
  ],
  client: [
    { entity: 'client', field: 'first_name', label: 'First Name', sampleValue: 'Jane' },
    { entity: 'client', field: 'last_name', label: 'Last Name', sampleValue: 'Doe' },
    { entity: 'client', field: 'full_name', label: 'Full Name', sampleValue: 'Jane Doe' },
    { entity: 'client', field: 'email', label: 'Email', sampleValue: 'jane.doe@email.com' },
    { entity: 'client', field: 'date_of_birth', label: 'Date of Birth', sampleValue: '01/15/1985' },
    { entity: 'client', field: 'primary_phone', label: 'Primary Phone', sampleValue: '(555) 987-6543' },
    { entity: 'client', field: 'primary_address', label: 'Primary Address', sampleValue: '123 Main St, City, ST 12345' },
  ],
  service: [
    { entity: 'service', field: 'service_number', label: 'Service Number', sampleValue: 'SVC-2026-0001' },
    { entity: 'service', field: 'status', label: 'Status', sampleValue: 'Active' },
    { entity: 'service', field: 'plan_type', label: 'Plan Type', sampleValue: 'Standard' },
    { entity: 'service', field: 'enrolled_date', label: 'Enrolled Date', sampleValue: '01/01/2026' },
    { entity: 'service', field: 'monthly_payment', label: 'Monthly Payment', sampleValue: '$350.00' },
    { entity: 'service', field: 'escrow_balance', label: 'Escrow Balance', sampleValue: '$1,500.00' },
    { entity: 'service', field: 'total_enrolled_debt', label: 'Total Enrolled Debt', sampleValue: '$45,000.00' },
  ],
  liability: [
    { entity: 'liability', field: 'creditor_name', label: 'Creditor Name', sampleValue: 'Chase Bank' },
    { entity: 'liability', field: 'account_number', label: 'Account Number (Last 4)', sampleValue: '****1234' },
    { entity: 'liability', field: 'current_balance', label: 'Current Balance', sampleValue: '$8,500.00' },
    { entity: 'liability', field: 'enrolled_balance', label: 'Enrolled Balance', sampleValue: '$10,000.00' },
    { entity: 'liability', field: 'status', label: 'Status', sampleValue: 'In Negotiation' },
  ],
  settlement: [
    { entity: 'settlement', field: 'offer_amount', label: 'Offer Amount', sampleValue: '$4,500.00' },
    { entity: 'settlement', field: 'savings_amount', label: 'Savings Amount', sampleValue: '$5,500.00' },
    { entity: 'settlement', field: 'savings_percentage', label: 'Savings Percentage', sampleValue: '55%' },
    { entity: 'settlement', field: 'payment_schedule', label: 'Payment Schedule', sampleValue: '3 monthly payments of $1,500' },
  ],
  company: [
    { entity: 'company', field: 'name', label: 'Company Name', sampleValue: 'Guardian Litigation Group' },
    { entity: 'company', field: 'phone', label: 'Company Phone', sampleValue: '(800) 555-1234' },
    { entity: 'company', field: 'email', label: 'Company Email', sampleValue: 'info@guardian.com' },
    { entity: 'company', field: 'address', label: 'Company Address', sampleValue: '100 Legal Ave, Suite 500' },
    { entity: 'company', field: 'website', label: 'Website', sampleValue: 'www.guardian.com' },
  ],
  staff: [
    { entity: 'staff', field: 'first_name', label: 'Staff First Name', sampleValue: 'Michael' },
    { entity: 'staff', field: 'last_name', label: 'Staff Last Name', sampleValue: 'Johnson' },
    { entity: 'staff', field: 'full_name', label: 'Staff Full Name', sampleValue: 'Michael Johnson' },
    { entity: 'staff', field: 'email', label: 'Staff Email', sampleValue: 'mjohnson@guardian.com' },
    { entity: 'staff', field: 'title', label: 'Title', sampleValue: 'Case Manager' },
  ],
  system: [
    { entity: 'system', field: 'today', label: 'Today\'s Date', sampleValue: 'February 2, 2026' },
    { entity: 'system', field: 'current_date', label: 'Current Date (Short)', sampleValue: '02/02/2026' },
    { entity: 'system', field: 'current_time', label: 'Current Time', sampleValue: '2:30 PM' },
    { entity: 'system', field: 'current_year', label: 'Current Year', sampleValue: '2026' },
  ],
};

// Get all merge fields as a flat array
export const getAllMergeFields = (): MergeFieldDefinition[] => {
  return Object.values(MERGE_FIELD_REGISTRY).flat();
};

// Get merge field tag format
export const getMergeFieldTag = (field: MergeFieldDefinition): string => {
  if (field.entity === 'system') {
    return `{${field.field}}`;
  }
  return `{${field.entity}.${field.field}}`;
};

// Default template categories
export const DEFAULT_TEMPLATE_CATEGORIES: Omit<TemplateCategoryInsert, 'company_id'>[] = [
  { name: 'Welcome', description: 'New client onboarding templates', template_type: 'email', sort_order: 1 },
  { name: 'Reminders', description: 'Payment and appointment reminders', template_type: null, sort_order: 2 },
  { name: 'Status Updates', description: 'Service and liability status changes', template_type: null, sort_order: 3 },
  { name: 'Settlement', description: 'Settlement notifications and letters', template_type: null, sort_order: 4 },
  { name: 'Legal', description: 'Legal documents and disclosures', template_type: 'document', sort_order: 5 },
  { name: 'Retention', description: 'Client retention outreach', template_type: null, sort_order: 6 },
  { name: 'Collections', description: 'Payment collection notices', template_type: null, sort_order: 7 },
  { name: 'General', description: 'Uncategorized templates', template_type: null, sort_order: 99 },
];

// Template type labels for UI
export const templateTypeLabels: Record<TemplateType, string> = {
  email: 'Email',
  sms: 'SMS',
  document: 'Document',
};

// Template language labels for UI
export const templateLanguageLabels: Record<TemplateLanguage, string> = {
  en: 'English',
  es: 'Spanish',
};

// Character limits
export const TEMPLATE_CHAR_LIMITS = {
  sms: 1600,
  emailSubject: 150,
  emailBody: null, // No limit
  document: null, // No limit
};

// Entity type labels for merge fields
export const mergeFieldEntityLabels: Record<string, string> = {
  lead: 'Lead',
  client: 'Client',
  service: 'Service',
  liability: 'Liability',
  settlement: 'Settlement',
  company: 'Company',
  staff: 'Staff',
  system: 'System',
};
