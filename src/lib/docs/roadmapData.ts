// Future Builds, Integrations, and Security documentation data

export interface RoadmapItem {
  id: string;
  name: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  status: 'Planned' | 'In Progress' | 'Research' | 'Completed';
  notes?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5; // 1=Easy, 5=Very Hard
  benefit?: 1 | 2 | 3 | 4 | 5;    // 1=Low, 5=High
}

export interface IntegrationItem {
  id: string;
  name: string;
  purpose: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Research' | 'Planned' | 'In Progress' | 'Completed';
  notes: string;
  apiDocs?: string;
}

export interface SecurityItem {
  id: string;
  issue: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export const FUTURE_BUILDS: RoadmapItem[] = [
  // Core Features
  {
    id: 'global-search',
    name: 'Global Search',
    category: 'Core',
    priority: 'High',
    description: 'Search across leads, clients, liabilities, and litigation matters with Command palette UI (Ctrl+K shortcut).',
    status: 'Completed',
    notes: 'Implemented with debounced parallel queries and grouped results.',
  },
  {
    id: 'notification-center',
    name: 'Notification Center',
    category: 'Core',
    priority: 'High',
    description: 'Bell icon dropdown with notification list, mark read functionality, and user preferences.',
    status: 'Completed',
    notes: 'Implemented with notifications and notification_preferences tables. NotificationCenter popover in TopNav with realtime updates. Task assignment trigger creates notifications automatically.',
  },
  {
    id: 'realtime-updates',
    name: 'Realtime Updates',
    category: 'Core',
    priority: 'High',
    description: 'Supabase channels for live data updates across notifications, tasks, and activities.',
    status: 'Completed',
    notes: 'Enabled realtime on tasks, leads, lead_activities, client_communications, litigation_activities, and service_status_history tables. Added useRealtimeSubscription hook with query invalidation pattern.',
  },
  
  // Lead Management
  {
    id: 'lead-scoring',
    name: 'Lead Scoring System',
    category: 'Leads',
    priority: 'High',
    description: 'Adjustable scoring criteria with profiles for different lead types/sources.',
    status: 'Completed',
    notes: 'Implemented lead_scoring_profiles table with JSONB criteria. Database trigger auto-calculates scores on lead insert/update. LeadScoreBadge component shows color-coded scores with breakdown tooltip. Scoring profiles configurable in Settings.',
  },
  {
    id: 'lead-assignment',
    name: 'Lead Assignment Engine',
    category: 'Leads',
    priority: 'High',
    description: 'Automated assignment based on round robin, skillset, backlog, or weighted methods.',
    status: 'Completed',
    notes: 'Database schema complete with lead_assignment_rules, lead_assignment_pool, lead_assignment_queue, and lead_assignment_log tables. Core assign_lead() function implemented. UI for rule management, pool editing, and availability toggle available in Settings.',
  },
  {
    id: 'duplicate-detection',
    name: 'Duplicate Lead Detection',
    category: 'Leads',
    priority: 'High',
    description: 'Match against existing leads AND clients. Block conversion if email exists in clients.',
    status: 'Completed',
    notes: 'Implemented with useDuplicateDetection hook and DuplicateWarningDialog. Checks email, phone, and name matches with confidence levels. Blocks enrollment if client email already exists.',
  },
  {
    id: 'lead-source-metrics',
    name: 'Lead Source Metrics',
    category: 'Leads',
    priority: 'High',
    description: 'Track contact ratio, credit pull ratio, conversion ratio, first draft clear rate, retention by source and rep.',
    status: 'Completed',
    notes: 'Implemented with lead_source_metrics and lead_rep_metrics views. Dashboard at /leads/metrics with funnel chart and rep leaderboard.',
  },
  
  // Litigation
  {
    id: 'opposing-counsel',
    name: 'Opposing Counsel Directory',
    category: 'Litigation',
    priority: 'High',
    description: 'Two-tier directory: Law Firms and Firm Contacts, assignable to litigation matters.',
    status: 'Completed',
    notes: 'Created law_firms and law_firm_contacts tables with RLS. Added OpposingCounselSelect component for litigation matter forms.',
  },
  {
    id: 'deadline-reminders',
    name: 'Deadline Reminder System',
    category: 'Litigation',
    priority: 'High',
    description: 'Automated reminders for response deadlines and hearings with configurable timing.',
    status: 'Completed',
    notes: 'Implemented with deadline_reminders and reminder_settings tables. Edge Function process-deadline-reminders runs hourly via pg_cron. Configurable reminder intervals (7, 3, 1 day) for response deadlines and hearings. Settings UI available at Settings → Reminders.',
  },
  
  // Payments
  {
    id: 'payment-processor',
    name: 'Payment Processor Integration',
    category: 'Payments',
    priority: 'High',
    description: 'Integration with Forth Pay for payment processing with status polling.',
    status: 'Research',
    difficulty: 4,
    benefit: 5,
    notes: 'Forth Pay will be first processor. Need API documentation and sandbox access.',
  },
  {
    id: 'recurring-payments',
    name: 'Recurring Payment Scheduling',
    category: 'Payments',
    priority: 'High',
    description: 'Automated payment scheduling with frequency options (monthly, semi-monthly, bi-weekly). Generates draft transactions and processor fees for full program term.',
    difficulty: 3,
    benefit: 5,
    status: 'Completed',
    notes: 'Implemented payment_schedules table with usePaymentSchedule hooks. PaymentSchedulePanel in ServiceDetailSheet shows progress, upcoming drafts, and modification controls. Supports skip/reschedule individual drafts.',
  },
  {
    id: 'nsf-retry',
    name: 'NSF Retry Logic',
    category: 'Payments',
    priority: 'High',
    description: 'Configurable retry attempts and timing for failed payments.',
    difficulty: 2,
    benefit: 4,
    status: 'Planned',
  },
  {
    id: 'escrow-automation',
    name: 'Escrow Balance Automation',
    category: 'Payments',
    priority: 'Medium',
    description: 'Auto-update escrow balance from transaction history.',
    difficulty: 2,
    benefit: 4,
    status: 'Planned',
  },
  
  // Settlements
  {
    id: 'creditor-response-tracking',
    name: 'Creditor Response Tracking',
    category: 'Settlements',
    priority: 'Medium',
    description: 'Track creditor responses and build settlement workflow matching current processes.',
    status: 'Planned',
    difficulty: 3,
    benefit: 4,
    notes: 'Need to document current settlement flow before implementation.',
  },
  
  // Analytics
  {
    id: 'program-success-rate',
    name: 'Program Success Rate Tracking',
    category: 'Analytics',
    priority: 'Medium',
    description: 'Track graduation vs cancellation rates across programs.',
    difficulty: 2,
    benefit: 3,
    status: 'Planned',
  },
  {
    id: 'scheduled-reports',
    name: 'Scheduled Report Generation',
    category: 'Reports',
    priority: 'Medium',
    description: 'Auto-generate and email reports on schedule.',
    difficulty: 3,
    benefit: 3,
    status: 'Planned',
  },
  
  // Communications
  {
    id: 'template-system',
    name: 'Template System',
    category: 'Communications',
    priority: 'Medium',
    description: 'Email, SMS, and document templates with merge fields.',
    difficulty: 3,
    benefit: 4,
    status: 'In Progress',
    notes: 'Phase 1-3 complete: Database schema, types/hooks, template management UI, merge field palette. Templates tab added to Settings. render-template edge function deployed.',
  },
  {
    id: 'esign-system',
    name: 'Proprietary eSign System',
    category: 'Documents',
    priority: 'High',
    description: 'First-class electronic signature system with signing ceremonies, SMS/email notifications, audit trails, and executed PDF storage.',
    status: 'Planned',
    difficulty: 5,
    benefit: 5,
    notes: `Full-featured eSign built into CRM:
• Signature Requests panel on Lead/Client records
• Send for Signature wizard with template selection and merge fields
• Multi-signer support with role assignment (Client, Spouse, Attorney)
• Email + SMS delivery via Twilio/Resend
• Public mobile-first signing ceremony with guided field completion
• Field types: Signature, Initial, Date, Text, Checkbox
• Append-only audit log with IP, user agent, timestamps
• SHA-256 document hashing and evidence bundle
• Executed PDF and Completion Certificate generation
• Workflow action node for automated sending
• Secure tokenized signing links (JWT/OTP)
• Timeline entries for Sent, Viewed, Completed events`,
  },
  {
    id: 'esign-docuseal',
    name: 'DocuSeal eSign Integration',
    category: 'Documents',
    priority: 'High',
    description: 'Hybrid eSign system using self-hosted DocuSeal for signing ceremonies with CRM-owned notifications, short links, and artifact storage.',
    status: 'Planned',
    difficulty: 4,
    benefit: 5,
    notes: `CRM + DocuSeal hybrid architecture:
• CRM is system of record; DocuSeal handles signing ceremony + PDF generation
• Signature Requests panel on Lead/Client records with multi-signer support (Client + Co-Client)
• Send for Signature wizard with template selection and signer configuration
• Signing modes: Parallel (default) or Sequential
• Delivery: Email + SMS (Twilio), Email only, or SMS only
• CRM-owned short links (/s/{token}) that redirect to DocuSeal signing URLs
• Inline DocuSeal field tags in DOCX/HTML templates for proper text reflow
• Webhook receiver for DocuSeal events (viewed, signed, completed, declined)
• Automatic artifact retrieval: Executed PDF, Completion Certificate, Evidence JSON
• Workflow action node: "Send Template for Signature (DocuSeal)"
• Language support: English/Spanish
• Expiration dates and reminder scheduling
• Status tracking: Draft, Queued, Sent, Viewed, Partially Signed, Completed, Declined, Expired, Canceled, Error
• Timeline entries for all signature events
• Idempotent job processing: create-send, reminders, expiration, completion`,
  },
  
  // Automation
  {
    id: 'workflow-builder',
    name: 'Workflow Automation Builder',
    category: 'Automation',
    priority: 'Medium',
    description: 'Visual workflow builder with triggers and status transition restrictions.',
    status: 'Completed',
    notes: 'Implemented with workflow_rules and workflow_executions tables. Supports multiple trigger types (status_changed, field_updated, record_created), condition builder with AND/OR logic, and actions (create_task, send_notification, update_field, block_transition). Blocking rules prevent status changes until conditions are met. UI available in Settings → Workflows.',
  },
  {
    id: 'sla-tracking',
    name: 'SLA Tracking',
    category: 'Compliance',
    priority: 'Medium',
    description: 'Track response times, processing times, and deadlines.',
    difficulty: 3,
    benefit: 3,
    status: 'Planned',
  },
  
  // Client Portal (Future)
  {
    id: 'client-booking',
    name: 'Client Appointment Booking',
    category: 'Client Portal',
    priority: 'Low',
    description: 'Shareable booking links for client appointments.',
    difficulty: 3,
    benefit: 2,
    status: 'Planned',
  },
  {
    id: 'client-portal',
    name: 'Client Portal',
    category: 'Client Portal',
    priority: 'Low',
    description: 'Self-service portal for clients to view status and documents.',
    difficulty: 5,
    benefit: 3,
    status: 'Planned',
  },
  
  // Services
  {
    id: 'service-graduation',
    name: 'Service Graduation Automation',
    category: 'Services',
    priority: 'Low',
    description: 'Auto-graduate services based on configurable criteria.',
    difficulty: 2,
    benefit: 3,
    status: 'Planned',
  },
  
  // Admin
  {
    id: 'audit-trail',
    name: 'Central Audit Trail Log',
    category: 'Admin',
    priority: 'Medium',
    description: 'Log of all system activity for compliance and debugging.',
    difficulty: 3,
    benefit: 4,
    status: 'Planned',
  },
  
  // UI
  {
    id: 'pagination',
    name: 'Pagination for List Views',
    category: 'UI',
    priority: 'High',
    description: 'Server-side pagination on Clients, Leads, Liabilities, and Payments pages with configurable page sizes.',
    status: 'Completed',
    notes: 'Implemented with usePagination hook and PaginationControls component. Uses Supabase .range() for efficient data fetching.',
  },
  {
    id: 'bulk-operations',
    name: 'Bulk Operations',
    category: 'UI',
    priority: 'Medium',
    description: 'Bulk select and actions on list views.',
    difficulty: 2,
    benefit: 3,
    status: 'Planned',
  },
];

export const INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    purpose: 'Staff email (individual sending as user)',
    priority: 'High',
    status: 'Research',
    notes: 'OAuth integration for sending emails from staff @company.com addresses. Store sent emails in client_communications.',
    apiDocs: 'https://developers.google.com/gmail/api',
  },
  {
    id: 'resend',
    name: 'Resend/SendGrid',
    purpose: 'System emails (automated notifications)',
    priority: 'High',
    status: 'Planned',
    notes: 'Transactional emails for notifications, reminders, password resets. High deliverability, no individual signatures needed.',
    apiDocs: 'https://resend.com/docs',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    purpose: 'SMS communications',
    priority: 'High',
    status: 'Planned',
    notes: 'Already have account. Need API key integration for sending and receiving SMS.',
    apiDocs: 'https://www.twilio.com/docs/sms',
  },
  {
    id: 'dialpad',
    name: 'Dialpad',
    purpose: 'Click-to-call, call pop, queues, dispositioning',
    priority: 'High',
    status: 'Research',
    notes: 'Research API architecture and webhooks. Key features: click-to-call buttons, incoming caller ID lookup (call pop), disposition codes, queue management.',
    apiDocs: 'https://developers.dialpad.com/',
  },
  {
    id: 'amazon-s3',
    name: 'Amazon S3',
    purpose: 'Document storage (alternative to Supabase Storage)',
    priority: 'Medium',
    status: 'Research',
    notes: 'May be beneficial for large volume document storage. Research SDK integration and cost comparison.',
    apiDocs: 'https://docs.aws.amazon.com/s3/',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    purpose: 'Calendar sync for appointments and deadlines',
    priority: 'Medium',
    status: 'Research',
    notes: 'OAuth for bi-directional sync. Push hearings, deadlines, and appointments to staff calendars.',
    apiDocs: 'https://developers.google.com/calendar',
  },
  {
    id: 'array-credit',
    name: 'Array Credit',
    purpose: 'Credit pull integration',
    priority: 'Medium',
    status: 'Research',
    notes: 'JSON file ingestion for credit reports. Parse and store credit data for leads/clients.',
  },
  {
    id: 'forth-pay',
    name: 'Forth Pay',
    purpose: 'Payment processor (primary)',
    priority: 'High',
    status: 'Research',
    notes: 'First payment integration. Need API documentation, sandbox access, and webhook setup.',
  },
  {
    id: 'global-holdings',
    name: 'Global Holdings',
    purpose: 'Payment processor (secondary)',
    priority: 'Medium',
    status: 'Planned',
    notes: 'Secondary processor. Implementation after Forth Pay.',
  },
  {
    id: 'docuseal',
    name: 'DocuSeal',
    purpose: 'Electronic signature ceremonies and PDF execution',
    priority: 'High',
    status: 'Research',
    notes: 'Open-source eSign engine. Self-hosted for data control. API for submission creation, webhook for status updates, artifact retrieval.',
    apiDocs: 'https://www.docuseal.co/docs/api',
  },
];

export const SECURITY_CONCERNS: SecurityItem[] = [
  {
    id: 'session-timeout',
    issue: 'Session Timeouts',
    category: 'Authentication',
    severity: 'High',
    description: 'Implement inactivity timeout (e.g., 30 minutes) to automatically log out inactive users.',
    status: 'Open',
  },
  {
    id: 'leaked-password',
    issue: 'Leaked Password Protection',
    category: 'Authentication',
    severity: 'High',
    description: 'Enable Supabase leaked password detection to prevent use of compromised passwords.',
    status: 'Open',
  },
  {
    id: 'password-reset-user',
    issue: 'User-Initiated Password Reset',
    category: 'Authentication',
    severity: 'Medium',
    description: 'Allow users to reset their own password (in addition to admin reset).',
    status: 'Open',
  },
  {
    id: 'ssn-encryption',
    issue: 'SSN Encryption Verification',
    category: 'Data Protection',
    severity: 'Critical',
    description: 'Verify proper encryption at rest for SSN fields (ssn_encrypted, ssn_last4_encrypted).',
    status: 'Open',
  },
  {
    id: 'rls-audit',
    issue: 'RLS Policy Audit',
    category: 'Database',
    severity: 'High',
    description: 'Full audit of all Row Level Security policies to ensure proper data isolation.',
    status: 'Open',
  },
  {
    id: 'rate-limiting',
    issue: 'Rate Limiting',
    category: 'API',
    severity: 'High',
    description: 'Implement rate limiting on auth endpoints and Edge Functions to prevent abuse.',
    status: 'Open',
  },
  {
    id: 'input-sanitization',
    issue: 'Input Sanitization',
    category: 'Security',
    severity: 'High',
    description: 'Verify all user inputs are properly sanitized to prevent injection attacks.',
    status: 'Open',
  },
  {
    id: 'audit-logging',
    issue: 'Audit Logging',
    category: 'Compliance',
    severity: 'Medium',
    description: 'Log all data access and modifications for compliance and forensics.',
    status: 'Open',
  },
  {
    id: 'mfa',
    issue: 'MFA Support',
    category: 'Authentication',
    severity: 'Medium',
    description: 'Add optional multi-factor authentication for enhanced security.',
    status: 'Open',
  },
  {
    id: 'api-key-rotation',
    issue: 'API Key Rotation',
    category: 'Integrations',
    severity: 'Medium',
    description: 'Implement key rotation policies for all external API integrations.',
    status: 'Open',
  },
];

// Helper to get items by category
export function getRoadmapByCategory(category: string): RoadmapItem[] {
  return FUTURE_BUILDS.filter(item => item.category === category);
}

export function getRoadmapByPriority(priority: 'High' | 'Medium' | 'Low'): RoadmapItem[] {
  return FUTURE_BUILDS.filter(item => item.priority === priority);
}

// Get unique categories
export function getRoadmapCategories(): string[] {
  return [...new Set(FUTURE_BUILDS.map(item => item.category))];
}
