// Role-specific user guides

export interface RoleGuide {
  role: string;
  title: string;
  introduction: string;
  gettingStarted: GuideStep[];
  dailyWorkflow: WorkflowSection[];
  keyFeatures: KeyFeature[];
  bestPractices: string[];
  commonTasks: CommonTask[];
}

export interface GuideStep {
  title: string;
  description: string;
}

export interface WorkflowSection {
  title: string;
  steps: string[];
}

export interface KeyFeature {
  feature: string;
  description: string;
  location: string;
}

export interface CommonTask {
  task: string;
  steps: string[];
}

export const ROLE_GUIDES: RoleGuide[] = [
  {
    role: 'admin',
    title: 'Administrator Guide',
    introduction: 'As an Administrator, you have full access to all system features and are responsible for managing the organization, staff, and system configuration. This guide covers your key responsibilities and how to accomplish common administrative tasks.',
    gettingStarted: [
      { title: 'Review Dashboard', description: 'Your Admin Dashboard provides company-wide metrics including total clients, revenue, staff activity, and system health indicators.' },
      { title: 'Verify Staff Setup', description: 'Ensure all staff members have appropriate roles and are assigned to the correct departments.' },
      { title: 'Configure Company Settings', description: 'Review and update company information, default settings, and business rules.' },
      { title: 'Set Up Creditor Database', description: 'Populate the creditor master list with commonly encountered creditors.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Review',
        steps: [
          'Check the Admin Dashboard for overnight activity',
          'Review any pending approvals or escalations',
          'Check system alerts and notifications',
          'Review staff attendance and activity',
        ],
      },
      {
        title: 'Operational Oversight',
        steps: [
          'Monitor key metrics across departments',
          'Address any escalated issues',
          'Review and approve status changes as needed',
          'Ensure deadlines are being met',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Review daily production numbers',
          'Check for outstanding tasks',
          'Plan for next day priorities',
          'Generate any needed reports',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Staff Management', description: 'Create, edit, and manage all staff accounts and role assignments', location: 'Administration > Staff' },
      { feature: 'Company Settings', description: 'Configure organization-wide settings and business rules', location: 'Administration > Companies' },
      { feature: 'Creditor Management', description: 'Maintain the master creditor database', location: 'Administration > Creditors' },
      { feature: 'Reports', description: 'Access all reports including financial and operational analytics', location: 'Reports' },
      { feature: 'Payment Overview', description: 'Monitor all financial transactions and escrow balances', location: 'Payments' },
    ],
    bestPractices: [
      'Regularly audit user access and permissions',
      'Keep the creditor database clean and up-to-date',
      'Review reports weekly for trends and issues',
      'Document all policy changes',
      'Train staff on system updates',
      'Back up critical data regularly',
      'Monitor for unusual activity',
    ],
    commonTasks: [
      {
        task: 'Create a New Staff Member',
        steps: [
          'Navigate to Administration > Staff',
          'Click "Add Staff"',
          'Fill in name, email, and department',
          'Select appropriate role(s)',
          'Click Save to create the account',
        ],
      },
      {
        task: 'Change a Staff Role',
        steps: [
          'Navigate to Administration > Staff',
          'Find and click the staff member',
          'Click Edit in the detail sheet',
          'Update the role assignment',
          'Save changes',
        ],
      },
      {
        task: 'Add a New Creditor',
        steps: [
          'Navigate to Administration > Creditors',
          'Click "Add Creditor"',
          'Select the creditor type',
          'Enter name and contact information',
          'Add any relevant notes',
          'Save the creditor record',
        ],
      },
      {
        task: 'Generate a Company Report',
        steps: [
          'Navigate to Reports',
          'Select a pre-set report or build custom',
          'Set date range and filters',
          'Run the report',
          'Export to CSV if needed',
        ],
      },
    ],
  },
  {
    role: 'attorney',
    title: 'Attorney Guide',
    introduction: 'As an Attorney, you provide legal oversight for the firm\'s consumer debt defense and litigation activities. Your primary responsibilities include approving settlements, managing litigation matters, and ensuring legal compliance.',
    gettingStarted: [
      { title: 'Review Pending Approvals', description: 'Check the Attorney Dashboard for settlements awaiting your approval.' },
      { title: 'Review Litigation Docket', description: 'Familiarize yourself with active litigation matters and upcoming deadlines.' },
      { title: 'Check Court Calendar', description: 'Review scheduled hearings and court appearances.' },
      { title: 'Review Team Assignments', description: 'See which case managers and staff are assigned to your matters.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Review',
        steps: [
          'Check pending settlement approvals',
          'Review new litigation matters',
          'Check response deadlines for this week',
          'Review today\'s court calendar',
        ],
      },
      {
        title: 'Case Management',
        steps: [
          'Review and approve settlement offers',
          'Draft or review legal documents',
          'Prepare for scheduled hearings',
          'Meet with case managers on complex matters',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Clear pending approvals',
          'Update matter statuses',
          'Log important case notes',
          'Plan for tomorrow\'s priorities',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Settlement Approval', description: 'Review and approve settlement offers before payment', location: 'Services > Settlements' },
      { feature: 'Litigation Matters', description: 'Manage all legal cases and court proceedings', location: 'Litigation' },
      { feature: 'Court Calendar', description: 'View all scheduled hearings across matters', location: 'Litigation > Court Calendar' },
      { feature: 'Document Management', description: 'Access and manage litigation documents', location: 'Litigation Matter > Documents' },
      { feature: 'Case Assignment', description: 'Assign matters to case managers and staff', location: 'Litigation Matter > Team' },
    ],
    bestPractices: [
      'Review settlements promptly to avoid payment delays',
      'Document all legal decisions with detailed notes',
      'Keep response deadlines prominently tracked',
      'Regularly review case load distribution',
      'Maintain organized case files',
      'Log all court outcomes immediately',
      'Communicate status updates to clients through staff',
    ],
    commonTasks: [
      {
        task: 'Approve a Settlement',
        steps: [
          'Open the settlement from your dashboard or matter',
          'Review the offer terms and liability history',
          'Verify the offer percentage is acceptable',
          'Check that settlement letter is on file',
          'Click Approve Settlement',
          'Add any approval notes',
        ],
      },
      {
        task: 'File an Answer to a Lawsuit',
        steps: [
          'Open the litigation matter',
          'Review the complaint and service date',
          'Prepare the answer document',
          'Upload the answer to matter documents',
          'Update matter status to "Answer Filed"',
          'Log the filing as an activity',
        ],
      },
      {
        task: 'Schedule a Court Hearing',
        steps: [
          'Open the litigation matter',
          'Click "Add Hearing"',
          'Enter hearing type and date/time',
          'Add location and judge information',
          'Save the hearing',
          'Hearing appears on Court Calendar',
        ],
      },
    ],
  },
  {
    role: 'case_manager',
    title: 'Case Manager Guide',
    introduction: 'As a Case Manager, you are the primary coordinator for client cases from enrollment through completion. You manage the day-to-day progress of services, coordinate between departments, and ensure clients stay on track.',
    gettingStarted: [
      { title: 'Review Assigned Cases', description: 'Check your dashboard for all services assigned to you.' },
      { title: 'Check Task Queue', description: 'Review pending tasks and prioritize your work.' },
      { title: 'Identify At-Risk Clients', description: 'Look for retention flags and payment issues.' },
      { title: 'Review Deadlines', description: 'Note any upcoming response deadlines or milestones.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Setup',
        steps: [
          'Check dashboard for new assignments',
          'Review overnight communications',
          'Prioritize today\'s tasks',
          'Check for urgent escalations',
        ],
      },
      {
        title: 'Case Work',
        steps: [
          'Work through task queue',
          'Update liability information',
          'Document client communications',
          'Coordinate with negotiators on settlements',
          'Escalate litigation matters as needed',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Update case notes',
          'Complete outstanding tasks',
          'Schedule follow-ups',
          'Review next day\'s priorities',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Services Dashboard', description: 'View and manage all assigned client services', location: 'Services' },
      { feature: 'Liability Management', description: 'Update debt information and creditor details', location: 'Liabilities' },
      { feature: 'Task Management', description: 'Create and complete tasks', location: 'Tasks' },
      { feature: 'Communication Logging', description: 'Document all client interactions', location: 'Client > Communications' },
      { feature: 'Litigation Escalation', description: 'Create litigation matters from liabilities', location: 'Liability > Escalate' },
    ],
    bestPractices: [
      'Keep client records updated in real-time',
      'Document every client interaction',
      'Proactively identify potential issues',
      'Communicate regularly with clients',
      'Collaborate closely with negotiators',
      'Escalate legal matters promptly',
      'Follow up on open tasks daily',
    ],
    commonTasks: [
      {
        task: 'Update Liability Information',
        steps: [
          'Open the client\'s service',
          'Go to the Liabilities tab',
          'Click on the liability to edit',
          'Update creditor, balance, or status',
          'Add notes about the change',
          'Save the update',
        ],
      },
      {
        task: 'Log a Client Communication',
        steps: [
          'Open the client record',
          'Go to Communications tab',
          'Click "Log Communication"',
          'Select type (call, email, etc.)',
          'Enter details and outcome',
          'Save the communication',
        ],
      },
      {
        task: 'Escalate to Litigation',
        steps: [
          'Open the liability being sued',
          'Click "Escalate to Litigation"',
          'Enter case details (court, case number)',
          'Set service date and response deadline',
          'Assign to an attorney',
          'Upload lawsuit documents',
        ],
      },
    ],
  },
  {
    role: 'negotiator',
    title: 'Negotiator Guide',
    introduction: 'As a Negotiator, you work directly with creditors to secure the best possible settlement terms for clients. Your success is measured by settlement percentages, turnaround time, and client satisfaction.',
    gettingStarted: [
      { title: 'Review Negotiation Queue', description: 'Check liabilities ready for negotiation based on escrow balances.' },
      { title: 'Learn Creditor Patterns', description: 'Review creditor database for negotiation history and preferences.' },
      { title: 'Check Settlement Pipeline', description: 'Review active offers and pending responses.' },
      { title: 'Review PLSA Projections', description: 'Understand when funds will be available for settlements.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Planning',
        steps: [
          'Review settlement queue',
          'Check for creditor responses',
          'Identify high-priority negotiations',
          'Plan call schedule for the day',
        ],
      },
      {
        title: 'Active Negotiation',
        steps: [
          'Make creditor calls',
          'Document all conversations',
          'Create and submit settlement offers',
          'Follow up on pending offers',
          'Request attorney approval when needed',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Update all offer statuses',
          'Log call outcomes',
          'Queue next day\'s priorities',
          'Submit offers for approval',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Negotiation Dashboard', description: 'View liabilities ready for negotiation', location: 'Dashboard' },
      { feature: 'Settlement Builder', description: 'Calculate and create settlement offers', location: 'Liability > Settlement Builder' },
      { feature: 'PLSA Projection', description: 'View projected PLSA balances', location: 'Engagement > PLSA' },
      { feature: 'Creditor Database', description: 'Access creditor contact info and history', location: 'Creditors' },
    ],
    bestPractices: [
      'Research creditor patterns before calling',
      'Document every creditor conversation',
      'Always get settlement terms in writing',
      'Calculate true settlement cost including fees',
      'Prioritize based on escrow availability',
      'Build relationships with creditor representatives',
      'Never commit to terms you can\'t deliver',
    ],
    commonTasks: [
      {
        task: 'Create a Settlement Offer',
        steps: [
          'Open the liability',
          'Click "New Settlement" or use Builder',
          'Enter offer amount and terms',
          'Select payment type (lump sum/plan)',
          'Set proposed payment date',
          'Submit for attorney approval if required',
        ],
      },
      {
        task: 'Log a Creditor Call',
        steps: [
          'Open the liability',
          'Click "Log Action"',
          'Select "Creditor Call"',
          'Enter call details and outcome',
          'Note any counter-offer received',
          'Set next action if needed',
        ],
      },
      {
        task: 'Accept a Counter-Offer',
        steps: [
          'Open the pending settlement',
          'Update offer amount to accepted terms',
          'Change status to "Accepted"',
          'Upload settlement letter',
          'Request attorney approval',
          'Schedule payments once approved',
        ],
      },
    ],
  },
  {
    role: 'sales_rep',
    title: 'Sales Representative Guide',
    introduction: 'As a Sales Representative, you are the first point of contact for potential clients. Your role is to qualify leads, explain services, and guide qualified prospects through the enrollment process.',
    gettingStarted: [
      { title: 'Review Lead Queue', description: 'Check the Leads Kanban for new and assigned leads.' },
      { title: 'Understand Products', description: 'Familiarize yourself with service plans and eligibility requirements.' },
      { title: 'Learn Enrollment Process', description: 'Practice the enrollment wizard flow.' },
      { title: 'Set Up Follow-ups', description: 'Organize your follow-up schedule.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Preparation',
        steps: [
          'Review new leads assigned',
          'Check follow-up schedule',
          'Prepare for scheduled calls',
          'Review conversion goals',
        ],
      },
      {
        title: 'Lead Work',
        steps: [
          'Contact new leads promptly',
          'Qualify based on eligibility criteria',
          'Log all activities',
          'Move qualified leads to enrollment',
          'Schedule follow-ups for interested prospects',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Update all lead statuses',
          'Complete activity logs',
          'Schedule tomorrow\'s callbacks',
          'Review daily conversion numbers',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Lead Kanban', description: 'Visual pipeline of all leads', location: 'Leads' },
      { feature: 'Enrollment Wizard', description: 'Step-by-step enrollment process', location: 'Lead > Start Enrollment' },
      { feature: 'Activity Logging', description: 'Track all lead interactions', location: 'Lead > Activities' },
      { feature: 'Lead Conversion', description: 'Convert qualified leads to clients', location: 'Enrollment Wizard' },
    ],
    bestPractices: [
      'Respond to new leads within 5 minutes',
      'Qualify thoroughly before enrolling',
      'Set clear expectations with prospects',
      'Document disqualification reasons',
      'Follow up consistently',
      'Know the eligibility requirements cold',
      'Be transparent about program details',
    ],
    commonTasks: [
      {
        task: 'Create a New Lead',
        steps: [
          'Click "New Lead"',
          'Enter name and contact info',
          'Select lead source',
          'Add estimated debt amount',
          'Assign to yourself',
          'Save and begin qualification',
        ],
      },
      {
        task: 'Qualify a Lead',
        steps: [
          'Review lead information',
          'Call or contact the prospect',
          'Ask eligibility questions',
          'Determine debt amount and types',
          'Update lead status to Qualified or Lost',
          'Log activity with notes',
        ],
      },
      {
        task: 'Enroll a Qualified Lead',
        steps: [
          'Open the qualified lead',
          'Click "Start Enrollment"',
          'Complete eligibility step',
          'Enter/verify client information',
          'Capture hardship details',
          'Get credit authorization',
          'Enter debts to enroll',
          'Complete disclosures',
          'Select plan',
          'Review and submit',
        ],
      },
    ],
  },
  {
    role: 'client_services_rep',
    title: 'Client Services Representative Guide',
    introduction: 'As a Client Services Representative, you are the primary ongoing contact for enrolled clients. Your role is to maintain client relationships, handle inquiries, and ensure client satisfaction throughout their program.',
    gettingStarted: [
      { title: 'Review Client Portfolio', description: 'Familiarize yourself with assigned clients and their statuses.' },
      { title: 'Check Communication Queue', description: 'Review any pending client requests or messages.' },
      { title: 'Identify Retention Flags', description: 'Note any clients flagged for retention attention.' },
      { title: 'Review Payment Statuses', description: 'Check for clients with payment issues.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Review',
        steps: [
          'Check for overnight inquiries',
          'Review retention flagged accounts',
          'Check payment alerts',
          'Plan outreach for the day',
        ],
      },
      {
        title: 'Client Support',
        steps: [
          'Handle incoming client calls',
          'Update client information',
          'Document all interactions',
          'Escalate issues as needed',
          'Make proactive check-in calls',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Complete all communication logs',
          'Follow up on open items',
          'Update contact statuses',
          'Review retention cases',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Client Detail', description: 'View complete client information', location: 'Clients > Client Detail' },
      { feature: 'Communication Log', description: 'Document all client interactions', location: 'Client > Communications' },
      { feature: 'Service Status', description: 'View and understand service progress', location: 'Services' },
      { feature: 'Retention Panel', description: 'Manage at-risk client accounts', location: 'Service > Retention' },
    ],
    bestPractices: [
      'Return client calls within 24 hours',
      'Document every client interaction',
      'Be proactive with check-in calls',
      'Escalate payment issues promptly',
      'Keep clients informed of progress',
      'Handle complaints professionally',
      'Know the program details thoroughly',
    ],
    commonTasks: [
      {
        task: 'Update Client Contact Info',
        steps: [
          'Open the client record',
          'Click the phone or address you want to update',
          'Make the necessary changes',
          'Mark as primary if applicable',
          'Save the update',
        ],
      },
      {
        task: 'Log a Client Call',
        steps: [
          'Open the client record',
          'Go to Communications',
          'Click "Log Communication"',
          'Enter call type (inbound/outbound)',
          'Add subject and detailed notes',
          'Record outcome',
          'Save the log',
        ],
      },
      {
        task: 'Handle a Retention Case',
        steps: [
          'Open the flagged service',
          'Review the retention reason',
          'Contact the client',
          'Address their concerns',
          'Document the resolution',
          'Clear the retention flag if resolved',
        ],
      },
    ],
  },
  {
    role: 'payment_processor',
    title: 'Payment Processor Guide',
    introduction: 'As a Payment Processor, you manage all financial transactions including escrow deposits, settlement payments, and fee collection. Accuracy and attention to detail are critical in this role.',
    gettingStarted: [
      { title: 'Review Payment Dashboard', description: 'Check scheduled payments and processing queue.' },
      { title: 'Understand Transaction Types', description: 'Learn the different types of transactions you\'ll process.' },
      { title: 'Check Processing Schedule', description: 'Know which payments are due today.' },
      { title: 'Review Failed Payments', description: 'Identify any payments needing attention.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Processing',
        steps: [
          'Review overnight transaction results',
          'Check for failed payments',
          'Verify today\'s scheduled payments',
          'Process any pending transactions',
        ],
      },
      {
        title: 'Transaction Management',
        steps: [
          'Process escrow deposits',
          'Schedule settlement payments',
          'Collect contingency fees',
          'Handle return items',
          'Update transaction statuses',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Reconcile day\'s transactions',
          'Review processing results',
          'Queue next day\'s payments',
          'Generate daily reports',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Payment Dashboard', description: 'Overview of all payment activity', location: 'Payments' },
      { feature: 'Transaction List', description: 'View and manage all transactions', location: 'Payments > Transactions' },
      { feature: 'Scheduled Payments', description: 'View upcoming scheduled payments', location: 'Payments > Scheduled' },
      { feature: 'PLSA Balances', description: 'View client PLSA account balances', location: 'Engagement > PLSA' },
    ],
    bestPractices: [
      'Process payments on schedule',
      'Double-check amounts before processing',
      'Document all transaction issues',
      'Follow up on failed payments same day',
      'Maintain accurate records',
      'Verify escrow balance before settlement payments',
      'Keep banking information secure',
    ],
    commonTasks: [
      {
        task: 'Process a Scheduled Payment',
        steps: [
          'Open the pending transaction',
          'Verify amount and account info',
          'Click "Process Payment"',
          'Confirm processing',
          'Transaction moves to processed status',
        ],
      },
      {
        task: 'Handle a Failed Payment',
        steps: [
          'Review the failed transaction',
          'Note the error reason',
          'Contact client services for follow-up',
          'Reschedule or cancel as appropriate',
          'Document the resolution',
        ],
      },
      {
        task: 'Schedule Settlement Payment',
        steps: [
          'Open the approved settlement',
          'Click "Schedule Payment"',
          'Verify escrow balance is sufficient',
          'Set payment date',
          'Confirm scheduling',
          'Transaction is created in pending status',
        ],
      },
    ],
  },
  {
    role: 'correspondence',
    title: 'Correspondence Specialist Guide',
    introduction: 'As a Correspondence Specialist, you manage all incoming and outgoing written communication with creditors. This includes processing mail, updating creditor information, and ensuring documents are properly filed.',
    gettingStarted: [
      { title: 'Review Document Queue', description: 'Check for incoming documents needing processing.' },
      { title: 'Learn Document Types', description: 'Understand the different types of correspondence.' },
      { title: 'Review Creditor Database', description: 'Familiarize yourself with the creditor master list.' },
      { title: 'Understand Filing System', description: 'Learn how documents are organized in the system.' },
    ],
    dailyWorkflow: [
      {
        title: 'Morning Processing',
        steps: [
          'Process overnight mail/faxes',
          'Scan and upload documents',
          'Route documents to appropriate staff',
          'Flag urgent items',
        ],
      },
      {
        title: 'Document Management',
        steps: [
          'Categorize incoming correspondence',
          'Update creditor contact information',
          'Prepare outgoing letters',
          'File documents to correct accounts',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'Complete document processing',
          'Verify all documents filed',
          'Prepare next day\'s outgoing mail',
          'Note any pending items',
        ],
      },
    ],
    keyFeatures: [
      { feature: 'Document Upload', description: 'Upload and categorize documents', location: 'Client/Litigation > Documents' },
      { feature: 'Creditor Management', description: 'Update creditor contact information', location: 'Creditors' },
      { feature: 'Liability Notes', description: 'Add notes to liability records', location: 'Liabilities' },
      { feature: 'Litigation Documents', description: 'Manage legal document filing', location: 'Litigation > Documents' },
    ],
    bestPractices: [
      'Process mail same day it\'s received',
      'Categorize documents accurately',
      'Flag legal documents immediately',
      'Keep creditor information updated',
      'Use clear, consistent naming conventions',
      'Note any changes in creditor ownership',
      'Track all correspondence dates',
    ],
    commonTasks: [
      {
        task: 'Upload a Document',
        steps: [
          'Navigate to the correct client or matter',
          'Click "Upload Document"',
          'Select the file',
          'Choose document type',
          'Add description/notes',
          'Save the upload',
        ],
      },
      {
        task: 'Update Creditor Address',
        steps: [
          'Find the creditor in the database',
          'Click to open details',
          'Update address information',
          'Note the source of new information',
          'Save changes',
        ],
      },
      {
        task: 'Process Incoming Lawsuit',
        steps: [
          'Identify the client from the document',
          'Flag as URGENT',
          'Upload to litigation documents',
          'Create task for legal team',
          'Notify case manager',
          'Log the receipt date',
        ],
      },
    ],
  },
];

export function getRoleGuide(role: string): RoleGuide | undefined {
  return ROLE_GUIDES.find(g => g.role === role);
}
