// Role-based permissions and access documentation

export interface RolePermission {
  role: string;
  displayName: string;
  department: string;
  description: string;
  dashboardAccess: string[];
  moduleAccess: ModuleAccess[];
  specialPermissions: string[];
}

export interface ModuleAccess {
  module: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  notes?: string;
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'admin',
    displayName: 'Administrator',
    department: 'administration',
    description: 'Full system access with ability to manage companies, staff, and system configuration. Administrators oversee all operations and have unrestricted access to all data and functions.',
    dashboardAccess: ['Admin Dashboard with company-wide metrics', 'All role-specific dashboards'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: true, create: true, update: true, delete: true },
      { module: 'Clients', read: true, create: true, update: true, delete: true },
      { module: 'Services', read: true, create: true, update: true, delete: true },
      { module: 'Liabilities', read: true, create: true, update: true, delete: true },
      { module: 'Settlements', read: true, create: true, update: true, delete: true },
      { module: 'Litigation', read: true, create: true, update: true, delete: true },
      { module: 'Tasks', read: true, create: true, update: true, delete: true },
      { module: 'Reports', read: true, create: true, update: true, delete: true },
      { module: 'Creditors', read: true, create: true, update: true, delete: true },
      { module: 'Companies', read: true, create: true, update: true, delete: true },
      { module: 'Staff', read: true, create: true, update: true, delete: true },
      { module: 'Payments', read: true, create: true, update: true, delete: true },
      { module: 'Settings', read: true, create: true, update: true, delete: true },
    ],
    specialPermissions: [
      'Create and manage staff accounts',
      'Configure company settings',
      'Assign roles to users',
      'Access all reports including financial',
      'Override status changes requiring approval',
      'Manage creditor master list',
      'View audit logs',
    ],
  },
  {
    role: 'attorney',
    displayName: 'Attorney',
    department: 'legal',
    description: 'Licensed attorneys handling litigation matters and settlement approvals. Attorneys review and approve settlements, manage court cases, and provide legal oversight.',
    dashboardAccess: ['Attorney Dashboard with litigation focus', 'Court calendar', 'Pending approvals'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: true, create: false, update: false, delete: false, notes: 'View only for case context' },
      { module: 'Clients', read: true, create: false, update: true, delete: false },
      { module: 'Services', read: true, create: false, update: true, delete: false },
      { module: 'Liabilities', read: true, create: false, update: true, delete: false },
      { module: 'Settlements', read: true, create: true, update: true, delete: false, notes: 'Can approve settlements' },
      { module: 'Litigation', read: true, create: true, update: true, delete: false },
      { module: 'Tasks', read: true, create: true, update: true, delete: true },
      { module: 'Reports', read: true, create: true, update: true, delete: false },
      { module: 'Creditors', read: true, create: false, update: false, delete: false },
    ],
    specialPermissions: [
      'Approve settlement offers',
      'File court documents',
      'Manage litigation matters',
      'Assign cases to case managers',
      'View court calendar',
      'Generate legal reports',
    ],
  },
  {
    role: 'case_manager',
    displayName: 'Case Manager',
    department: 'legal',
    description: 'Manages client cases from enrollment through completion. Case managers coordinate between departments, track progress, and ensure clients stay on track with their programs.',
    dashboardAccess: ['Case Manager Dashboard with assigned caseload', 'Task queue', 'Client status overview'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: true, create: false, update: false, delete: false },
      { module: 'Clients', read: true, create: true, update: true, delete: false },
      { module: 'Services', read: true, create: true, update: true, delete: false },
      { module: 'Liabilities', read: true, create: true, update: true, delete: false },
      { module: 'Settlements', read: true, create: false, update: true, delete: false, notes: 'Cannot create, can update status' },
      { module: 'Litigation', read: true, create: true, update: true, delete: false },
      { module: 'Tasks', read: true, create: true, update: true, delete: true },
      { module: 'Reports', read: true, create: true, update: true, delete: false },
      { module: 'Creditors', read: true, create: false, update: false, delete: false },
    ],
    specialPermissions: [
      'Manage assigned client cases',
      'Update liability information',
      'Escalate to litigation',
      'Create and assign tasks',
      'Log client communications',
      'Upload client documents',
    ],
  },
  {
    role: 'negotiator',
    displayName: 'Negotiator',
    department: 'negotiations',
    description: 'Negotiates settlements with creditors on behalf of clients. Negotiators work to secure the best possible settlement terms and manage creditor communications.',
    dashboardAccess: ['Negotiator Dashboard with settlement pipeline', 'Negotiation queue', 'Settlement metrics'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: false, create: false, update: false, delete: false },
      { module: 'Clients', read: true, create: false, update: false, delete: false },
      { module: 'Services', read: true, create: false, update: false, delete: false },
      { module: 'Liabilities', read: true, create: false, update: true, delete: false },
      { module: 'Settlements', read: true, create: true, update: true, delete: false },
      { module: 'Litigation', read: true, create: false, update: false, delete: false },
      { module: 'Tasks', read: true, create: true, update: true, delete: false },
      { module: 'Creditors', read: true, create: true, update: true, delete: false },
    ],
    specialPermissions: [
      'Create settlement offers',
      'Update offer status',
      'Log creditor communications',
      'Request attorney approval',
      'Update creditor contact information',
      'Track settlement negotiations',
    ],
  },
  {
    role: 'sales_rep',
    displayName: 'Sales Representative',
    department: 'sales',
    description: 'Handles lead intake and qualification. Sales reps work with potential clients to assess eligibility, explain services, and guide them through enrollment.',
    dashboardAccess: ['Sales Dashboard with lead pipeline', 'Conversion metrics', 'Personal performance'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: true, create: true, update: true, delete: false },
      { module: 'Clients', read: true, create: true, update: false, delete: false, notes: 'Create during conversion only' },
      { module: 'Services', read: true, create: true, update: false, delete: false, notes: 'Create during enrollment only' },
      { module: 'Liabilities', read: false, create: false, update: false, delete: false },
      { module: 'Settlements', read: false, create: false, update: false, delete: false },
      { module: 'Litigation', read: false, create: false, update: false, delete: false },
      { module: 'Tasks', read: true, create: true, update: true, delete: false },
      { module: 'Creditors', read: true, create: false, update: false, delete: false },
    ],
    specialPermissions: [
      'Create and manage leads',
      'Run enrollment wizard',
      'Convert leads to clients',
      'Log lead activities',
      'Schedule follow-ups',
      'View lead reports',
    ],
  },
  {
    role: 'client_services_rep',
    displayName: 'Client Services Representative',
    department: 'client_services',
    description: 'Primary point of contact for enrolled clients. Handles client inquiries, updates, and ensures client satisfaction throughout their program.',
    dashboardAccess: ['Client Services Dashboard', 'Contact queue', 'Retention alerts'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: false, create: false, update: false, delete: false },
      { module: 'Clients', read: true, create: false, update: true, delete: false },
      { module: 'Services', read: true, create: false, update: true, delete: false },
      { module: 'Liabilities', read: true, create: false, update: false, delete: false },
      { module: 'Settlements', read: true, create: false, update: false, delete: false },
      { module: 'Litigation', read: true, create: false, update: false, delete: false },
      { module: 'Tasks', read: true, create: true, update: true, delete: false },
      { module: 'Creditors', read: true, create: false, update: false, delete: false },
    ],
    specialPermissions: [
      'Update client contact information',
      'Log client communications',
      'Handle retention cases',
      'Update payment information',
      'Request status changes',
      'Upload client documents',
    ],
  },
  {
    role: 'payment_processor',
    displayName: 'Payment Processor',
    department: 'operations',
    description: 'Manages payment processing and escrow transactions. Ensures payments are processed correctly and maintains accurate financial records.',
    dashboardAccess: ['Payment Processor Dashboard', 'Transaction queue', 'Payment alerts'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: false, create: false, update: false, delete: false },
      { module: 'Clients', read: true, create: false, update: false, delete: false },
      { module: 'Services', read: true, create: false, update: true, delete: false, notes: 'Payment-related fields only' },
      { module: 'Liabilities', read: true, create: false, update: false, delete: false },
      { module: 'Settlements', read: true, create: false, update: true, delete: false, notes: 'Payment status only' },
      { module: 'Litigation', read: false, create: false, update: false, delete: false },
      { module: 'Tasks', read: true, create: true, update: true, delete: false },
      { module: 'Payments', read: true, create: true, update: true, delete: false },
    ],
    specialPermissions: [
      'Process escrow deposits',
      'Schedule settlement payments',
      'Process fee collections',
      'Handle failed payments',
      'View payment history',
      'Generate payment reports',
    ],
  },
  {
    role: 'correspondence',
    displayName: 'Correspondence Specialist',
    department: 'operations',
    description: 'Manages incoming and outgoing correspondence with creditors. Handles document processing, mail, and communication logging.',
    dashboardAccess: ['Correspondence Dashboard', 'Document queue', 'Mail processing'],
    moduleAccess: [
      { module: 'Dashboard', read: true, create: false, update: false, delete: false },
      { module: 'Leads', read: false, create: false, update: false, delete: false },
      { module: 'Clients', read: true, create: false, update: false, delete: false },
      { module: 'Services', read: true, create: false, update: false, delete: false },
      { module: 'Liabilities', read: true, create: false, update: true, delete: false, notes: 'Creditor contact updates' },
      { module: 'Settlements', read: true, create: false, update: false, delete: false },
      { module: 'Litigation', read: true, create: false, update: true, delete: false, notes: 'Document uploads' },
      { module: 'Tasks', read: true, create: true, update: true, delete: false },
      { module: 'Creditors', read: true, create: true, update: true, delete: false },
    ],
    specialPermissions: [
      'Upload correspondence documents',
      'Update creditor addresses',
      'Log incoming mail',
      'Process outgoing letters',
      'Create creditor records',
      'Flag urgent correspondence',
    ],
  },
];

export function getRoleByName(role: string): RolePermission | undefined {
  return ROLE_PERMISSIONS.find(r => r.role === role);
}

export function getModuleAccess(role: string, module: string): ModuleAccess | undefined {
  const roleData = getRoleByName(role);
  return roleData?.moduleAccess.find(m => m.module === module);
}
