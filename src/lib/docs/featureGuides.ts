// Feature documentation and user guides

export interface FeatureGuide {
  id: string;
  title: string;
  category: 'core' | 'workflow' | 'admin' | 'reporting';
  description: string;
  sections: GuideSection[];
}

export interface GuideSection {
  title: string;
  content: string;
  steps?: string[];
  tips?: string[];
  warnings?: string[];
}

export const FEATURE_GUIDES: FeatureGuide[] = [
  {
    id: 'leads',
    title: 'Lead Management',
    category: 'core',
    description: 'Comprehensive guide to managing leads from initial intake through conversion to enrolled clients.',
    sections: [
      {
        title: 'Overview',
        content: 'The Leads module is the entry point for all potential clients. Leads progress through a pipeline from New to Contacted, Qualified, and finally Converted or Lost. The system automatically tracks timestamps for each status change.',
      },
      {
        title: 'Creating a New Lead',
        content: 'New leads can be created manually or through the enrollment wizard.',
        steps: [
          'Navigate to Leads from the sidebar',
          'Click "New Lead" button in the top right',
          'Fill in required fields: First Name, Last Name',
          'Add contact information: Email and/or Phone',
          'Select the lead source (Web Form, Phone, Referral, Marketing)',
          'Choose the interest type (Debt Resolution or Litigation Defense)',
          'Enter estimated debt amount if known',
          'Click "Create Lead" to save',
        ],
        tips: [
          'The lead number is auto-generated in format LEAD-YYYY-XXXX',
          'You can assign the lead to yourself or another sales rep immediately',
          'Adding estimated debt amount helps prioritize leads',
        ],
      },
      {
        title: 'Lead Pipeline Management',
        content: 'Leads move through the Kanban board as you work them through the sales process.',
        steps: [
          'Use the Kanban view to visualize leads by status',
          'Drag leads between columns to update their status',
          'Click on a lead card to open the detail sheet',
          'Log activities using the activity section',
          'Schedule follow-ups with next action dates',
        ],
        tips: [
          'The system tracks how long leads stay in each status',
          'Conversion rate is calculated automatically',
          'Filter leads by source, status, or assigned rep',
        ],
      },
      {
        title: 'Enrollment Wizard',
        content: 'The enrollment wizard guides you through a complete intake process for qualified leads.',
        steps: [
          'From the lead detail, click "Start Enrollment"',
          'Complete eligibility questions (bankruptcy status, federal accounts, etc.)',
          'Enter or verify client information',
          'Capture employment and hardship information',
          'Obtain credit authorization consent',
          'Enter debts to be enrolled',
          'Complete banking and disclosure steps',
          'Select a program plan',
          'Review and submit the enrollment',
        ],
        warnings: [
          'The wizard auto-saves progress - you can resume later',
          'Credit authorization is legally required before pulling credit',
          'All disclosures must be acknowledged before enrollment',
        ],
      },
      {
        title: 'Converting a Lead',
        content: 'When a lead completes enrollment, they are converted to a client with an active service.',
        steps: [
          'Complete the enrollment wizard through the Review step',
          'Click "Submit Enrollment"',
          'The system creates a new client record',
          'A new service record is created with enrolled debts',
          'The lead status is updated to "Converted"',
          'The lead is linked to the new service for reference',
        ],
      },
    ],
  },
  {
    id: 'services',
    title: 'Service Management',
    category: 'core',
    description: 'Managing client services from enrollment through graduation, including status tracking and financial management.',
    sections: [
      {
        title: 'Overview',
        content: 'Services represent active client engagements in a debt settlement program. Each service has a primary client, enrolled debts, and tracks financial progress through the program.',
      },
      {
        title: 'Service Statuses',
        content: 'Services progress through a defined lifecycle:',
        steps: [
          'Prospect - Initial creation before paperwork complete',
          'Pending Docs - Awaiting required documentation',
          'Pending Payment - Awaiting first payment',
          'Active - Fully enrolled and making payments',
          'Paused - Temporarily suspended',
          'Graduated - Successfully completed program',
          'Cancelled - Client-initiated cancellation',
          'Terminated - Firm-initiated termination',
        ],
      },
      {
        title: 'Sub-Status Tracking',
        content: 'Services have additional status dimensions for detailed tracking:',
        steps: [
          'Contact Status: Reachable, Unreachable, No Contact',
          'Payment Status: Current, Late, Severely Late, NSF',
          'Retention Flag: Indicates client at risk of cancellation',
        ],
        tips: [
          'Sub-statuses help identify clients needing attention',
          'Status changes are logged with timestamps and reasons',
          'Use the retention panel for at-risk clients',
        ],
      },
      {
        title: 'Financial Tracking',
        content: 'Each service tracks key financial metrics:',
        steps: [
          'Total Enrolled Debt - Sum of all enrolled liabilities',
          'Monthly Payment - Regular escrow deposit amount',
          'Escrow Balance - Current funds available for settlements',
          'Settlement Fee Percentage - Fee charged on settlements',
          'Estimated Settlement Percentage - Target settlement rate',
        ],
      },
      {
        title: 'Retention Management',
        content: 'When clients are at risk of leaving the program, use the retention system.',
        steps: [
          'Flag the service for retention',
          'Select the retention type (Payment Issue, Communication, Dissatisfaction, etc.)',
          'Assign to a retention specialist',
          'Document retention efforts',
          'Clear the flag when resolved',
        ],
        warnings: [
          'Retention cases require timely follow-up',
          'Document all client interactions',
          'Escalate unresolved cases to management',
        ],
      },
    ],
  },
  {
    id: 'liabilities',
    title: 'Liability Management',
    category: 'core',
    description: 'Managing enrolled debts from initial enrollment through settlement or resolution.',
    sections: [
      {
        title: 'Overview',
        content: 'Liabilities are individual debt accounts enrolled in a client\'s service. Each liability tracks the original creditor, current holder, balance changes, and settlement progress.',
      },
      {
        title: 'Liability Information',
        content: 'Each liability record contains:',
        steps: [
          'Original Creditor - Who issued the original credit',
          'Current Creditor - Who currently owns the debt',
          'Debt Buyer - If the debt was sold',
          'Law Firm - If in collections litigation',
          'Account Number - Masked account identifier',
          'Liability Type - Credit card, personal loan, medical, etc.',
          'Original Balance - Balance when account opened',
          'Enrolled Balance - Balance when enrolled in program',
          'Current Balance - Latest known balance',
        ],
      },
      {
        title: 'Liability Statuses',
        content: 'Liabilities progress through the settlement pipeline:',
        steps: [
          'Enrolled - Added to program, awaiting negotiation',
          'Negotiating - Active settlement discussions',
          'Offer Pending - Settlement offer made, awaiting response',
          'Settled - Settlement agreement reached',
          'Paid Off - Settlement fully paid',
          'Litigation - Escalated to legal department',
          'Removed - Removed from program',
        ],
      },
      {
        title: 'Updating Creditor Information',
        content: 'Keep creditor information current as debts are transferred.',
        steps: [
          'Open the liability detail sheet',
          'Update the Current Creditor if debt was sold',
          'Add Debt Buyer information if applicable',
          'Add Law Firm if the debt is in litigation',
          'Use "Other" fields if the creditor isn\'t in the master list',
        ],
        tips: [
          'Debt buyers often negotiate differently than original creditors',
          'Law firm involvement may indicate litigation risk',
          'Keep notes on creditor contact history',
        ],
      },
      {
        title: 'Priority Management',
        content: 'Set liability priority to determine settlement order.',
        steps: [
          'Review all liabilities on a service',
          'Consider factors: litigation risk, creditor flexibility, balance size',
          'Set priority numbers (lower = higher priority)',
          'Use the escrow projection to plan settlements',
        ],
      },
    ],
  },
  {
    id: 'settlements',
    title: 'Settlement Negotiation',
    category: 'workflow',
    description: 'Creating, managing, and completing settlement offers with creditors.',
    sections: [
      {
        title: 'Overview',
        content: 'Settlements are negotiated agreements with creditors to pay less than the full balance owed. The system tracks offers, counter-offers, approvals, and payment schedules.',
      },
      {
        title: 'Creating a Settlement Offer',
        content: 'Negotiators create offers based on creditor discussions.',
        steps: [
          'Open the liability detail or use the Settlement Builder',
          'Click "New Settlement Offer"',
          'Enter the offer amount',
          'The system calculates the offer percentage',
          'Select payment type (Lump Sum or Payment Plan)',
          'For payment plans, enter number of payments',
          'Set the first payment date',
          'Add any notes about the negotiation',
          'Submit for attorney approval if required',
        ],
        tips: [
          'The Settlement Offer Builder helps calculate optimal offers',
          'Consider the escrow balance when proposing amounts',
          'Most creditors prefer lump sum settlements',
        ],
      },
      {
        title: 'Settlement Statuses',
        content: 'Track settlements through the negotiation process:',
        steps: [
          'Offered - Initial offer submitted to creditor',
          'Counter Offered - Creditor responded with different terms',
          'Accepted - Both parties agreed to terms',
          'Rejected - Creditor declined the offer',
          'In Progress - Payments being made',
          'Completed - All payments made, debt resolved',
          'Defaulted - Client missed settlement payments',
        ],
      },
      {
        title: 'Attorney Approval',
        content: 'Certain settlements require attorney review and approval.',
        steps: [
          'Settlements over a threshold amount require approval',
          'Settlements in litigation always require approval',
          'Submit the settlement for review',
          'Attorney reviews terms and documentation',
          'Attorney approves or requests changes',
          'Once approved, payments can be scheduled',
        ],
        warnings: [
          'Do not make payment commitments before approval',
          'Document all verbal agreements in writing',
          'Ensure settlement letters are received before payment',
        ],
      },
      {
        title: 'Payment Scheduling',
        content: 'Once a settlement is accepted, schedule the payments.',
        steps: [
          'Open the accepted settlement',
          'View the payment schedule',
          'Verify escrow balance covers payments',
          'Schedule payments through the payment processor',
          'Monitor payment status',
          'Mark settlement complete when fully paid',
        ],
      },
    ],
  },
  {
    id: 'litigation',
    title: 'Litigation Management',
    category: 'workflow',
    description: 'Managing legal cases from service of process through resolution.',
    sections: [
      {
        title: 'Overview',
        content: 'Litigation matters track legal cases where creditors have filed lawsuits against clients. The system manages case details, court dates, documents, and resolution.',
      },
      {
        title: 'Creating a Litigation Matter',
        content: 'Matters are created when a client is served with a lawsuit.',
        steps: [
          'Navigate to the client\'s service',
          'Open the Litigation tab',
          'Click "New Litigation Matter"',
          'Select the related liability',
          'Enter case details: case number, court, opposing party',
          'Enter service date and response deadline',
          'Assign to an attorney',
          'Upload the summons and complaint',
        ],
        warnings: [
          'Response deadlines are critical - missing them can result in default judgment',
          'Always verify service date and calculate deadline accurately',
          'Escalate immediately to legal team',
        ],
      },
      {
        title: 'Litigation Statuses',
        content: 'Track cases through the legal process:',
        steps: [
          'New - Recently identified, needs review',
          'Served - Client served, response deadline set',
          'Answer Filed - Response submitted to court',
          'Discovery - Exchanging information with opposing party',
          'Mediation - Attempting settlement through mediation',
          'Trial - Case proceeding to trial',
          'Judgment - Court entered judgment',
          'Settled - Case settled before or after judgment',
          'Dismissed - Case dismissed by court',
          'Closed - Matter resolved and closed',
        ],
      },
      {
        title: 'Managing Hearings',
        content: 'Schedule and track court appearances.',
        steps: [
          'Open the litigation matter',
          'Click "Add Hearing"',
          'Enter hearing type (Motion, Status, Trial, etc.)',
          'Set date, time, and location',
          'Add judge name if known',
          'Hearings appear on the Court Calendar',
          'Log outcomes after each hearing',
        ],
        tips: [
          'Set reminders before court dates',
          'Prepare documents in advance',
          'Log all hearing outcomes for case history',
        ],
      },
      {
        title: 'Document Management',
        content: 'Litigation requires extensive document tracking.',
        steps: [
          'Upload all court filings',
          'Categorize by document type',
          'Track filed dates and deadlines',
          'Note which documents have been served',
          'Keep correspondence with opposing counsel',
        ],
      },
      {
        title: 'Court Calendar',
        content: 'The Court Calendar provides a unified view of all upcoming hearings.',
        steps: [
          'Access via Litigation > Court Calendar',
          'View hearings by month',
          'Filter by attorney or case status',
          'Click hearings to view matter details',
          'Print calendar for court appearances',
        ],
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Task Management',
    category: 'workflow',
    description: 'Creating, assigning, and completing tasks for workflow management.',
    sections: [
      {
        title: 'Overview',
        content: 'Tasks help manage daily workflow and ensure nothing falls through the cracks. Tasks can be standalone or linked to specific entities like clients, services, or litigation matters.',
      },
      {
        title: 'Creating Tasks',
        content: 'Create tasks for yourself or assign to others.',
        steps: [
          'Click "New Task" from the Tasks page or any entity',
          'Enter a descriptive title',
          'Add detailed description if needed',
          'Select task type (General, Follow-up, Review, etc.)',
          'Set priority (Low, Medium, High, Urgent)',
          'Set due date',
          'Assign to a staff member',
          'Link to an entity if applicable',
        ],
        tips: [
          'Be specific in task titles',
          'Set realistic due dates',
          'Link tasks to entities for context',
        ],
      },
      {
        title: 'Task Statuses',
        content: 'Track task progress:',
        steps: [
          'Pending - Not yet started',
          'In Progress - Currently being worked',
          'Completed - Successfully finished',
          'Cancelled - No longer needed',
        ],
      },
      {
        title: 'Kanban View',
        content: 'Use the Kanban board for visual task management.',
        steps: [
          'View tasks organized by status columns',
          'Drag tasks between columns to update status',
          'Filter by assignee, priority, or type',
          'Click task cards for details',
        ],
      },
      {
        title: 'Task Assignment',
        content: 'Delegate work effectively.',
        steps: [
          'Select assignee when creating task',
          'Reassign tasks as needed',
          'Assignees see tasks on their dashboard',
          'Filter to view assigned tasks',
        ],
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    category: 'reporting',
    description: 'Generating reports, building custom queries, and analyzing data.',
    sections: [
      {
        title: 'Overview',
        content: 'The Reports module provides both pre-set reports for common metrics and a custom report builder for ad-hoc analysis.',
      },
      {
        title: 'Pre-Set Reports',
        content: 'Quick access to common reports:',
        steps: [
          'Lead Conversion - Track pipeline and conversion rates',
          'Enrollment Report - Monitor new enrollments',
          'Settlement Report - Analyze settlement performance',
          'Revenue Report - Track fee collection',
          'Caseload Report - View staff workload',
        ],
        tips: [
          'Pre-set reports update in real-time',
          'Export to CSV for further analysis',
          'Share report links with team members',
        ],
      },
      {
        title: 'Custom Report Builder',
        content: 'Build custom reports from any data module.',
        steps: [
          'Select the data source module',
          'Choose columns to include',
          'Add filters to narrow results',
          'Set date range if applicable',
          'Configure sorting',
          'Add chart visualization (optional)',
          'Preview results',
          'Run full report or save as template',
        ],
      },
      {
        title: 'Saving Report Templates',
        content: 'Save configurations for repeated use.',
        steps: [
          'Build your report configuration',
          'Click "Save as Template"',
          'Enter a name and description',
          'Choose to share with company or keep private',
          'Access saved reports from the Saved Reports tab',
          'Run, edit, or delete saved templates',
        ],
      },
      {
        title: 'Exporting Data',
        content: 'Export report results for external use.',
        steps: [
          'Run your report',
          'Click "Export CSV"',
          'File downloads with all visible columns',
          'Open in Excel or other spreadsheet software',
        ],
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payment Processing',
    category: 'workflow',
    description: 'Managing escrow deposits, settlement payments, and fee collection.',
    sections: [
      {
        title: 'Overview',
        content: 'The Payments module handles all financial transactions including client escrow deposits, settlement payments to creditors, and fee collection.',
      },
      {
        title: 'Transaction Types',
        content: 'Different types of transactions in the system:',
        steps: [
          'Escrow Deposit - Client monthly payment into escrow',
          'Settlement Payment - Payment to creditor for settlement',
          'Contingency Fee - Performance fee on settlements',
          'Service Fee - Monthly service fee',
          'Refund - Return of funds to client',
        ],
      },
      {
        title: 'Processing Escrow Deposits',
        content: 'Handle incoming client payments.',
        steps: [
          'View scheduled deposits on the dashboard',
          'Process pending transactions',
          'Handle NSF/failed payments',
          'Update payment schedules as needed',
          'Track payment history per client',
        ],
        warnings: [
          'Verify bank information before processing',
          'Contact clients about failed payments promptly',
          'Document payment arrangement changes',
        ],
      },
      {
        title: 'Settlement Payments',
        content: 'Pay creditors for completed settlements.',
        steps: [
          'View settlements ready for payment',
          'Verify escrow balance covers payment',
          'Schedule payment for settlement date',
          'Process payment to creditor',
          'Collect contingency fee',
          'Mark settlement as completed',
        ],
      },
      {
        title: 'Transaction Statuses',
        content: 'Track payment lifecycle:',
        steps: [
          'Pending - Scheduled for future date',
          'Processing - Currently being processed',
          'Processed - Successfully completed',
          'Failed - Payment failed (NSF, error)',
          'Cancelled - Manually cancelled',
        ],
      },
    ],
  },
  {
    id: 'creditors',
    title: 'Creditor Management',
    category: 'admin',
    description: 'Maintaining the master creditor database.',
    sections: [
      {
        title: 'Overview',
        content: 'The Creditors module maintains a master list of creditors, debt buyers, collection agencies, and law firms. This data is shared across all liabilities for consistency.',
      },
      {
        title: 'Creditor Types',
        content: 'Different entities in the collection chain:',
        steps: [
          'Original Creditor - Bank or company that issued credit',
          'Debt Buyer - Company that purchased the debt',
          'Collection Agency - Agency collecting on behalf of creditor',
          'Law Firm - Legal firm pursuing collection',
        ],
      },
      {
        title: 'Adding Creditors',
        content: 'Add new creditors to the master list.',
        steps: [
          'Navigate to Creditors in Administration',
          'Click "Add Creditor"',
          'Select creditor type',
          'Enter name and contact information',
          'Add address details',
          'Add any notes about the creditor',
          'Save the creditor record',
        ],
        tips: [
          'Check if creditor exists before creating duplicates',
          'Keep contact information current',
          'Add notes about negotiation experience',
        ],
      },
      {
        title: 'Creditor Details',
        content: 'View creditor information and linked liabilities.',
        steps: [
          'Click on a creditor to open details',
          'View contact information',
          'See all linked liabilities',
          'View settlement history with this creditor',
          'Edit information as needed',
        ],
      },
    ],
  },
  {
    id: 'staff',
    title: 'Staff Management',
    category: 'admin',
    description: 'Managing staff accounts, roles, and permissions.',
    sections: [
      {
        title: 'Overview',
        content: 'Administrators manage staff accounts, assign roles, and configure access permissions. Each staff member belongs to a department and can have one or more roles.',
      },
      {
        title: 'Creating Staff Accounts',
        content: 'Add new staff members to the system.',
        steps: [
          'Navigate to Staff in Administration',
          'Click "Add Staff"',
          'Enter personal information',
          'Set email address (used for login)',
          'Select department',
          'Assign role(s)',
          'Save to create account',
          'Staff receives email with login instructions',
        ],
        warnings: [
          'Double-check email address - it cannot be changed easily',
          'Assign minimum necessary permissions',
          'Review roles carefully before assignment',
        ],
      },
      {
        title: 'Roles and Permissions',
        content: 'Understand the role-based access system.',
        steps: [
          'Each role grants specific module access',
          'Roles determine what data users can see',
          'Roles control what actions users can take',
          'Multiple roles can be assigned to one user',
          'Role changes take effect immediately',
        ],
      },
      {
        title: 'Deactivating Staff',
        content: 'Properly offboard departing staff.',
        steps: [
          'Open the staff member profile',
          'Click "Deactivate"',
          'Reassign their open tasks',
          'Transfer assigned clients/cases',
          'Confirm deactivation',
        ],
        tips: [
          'Deactivation preserves history for audit',
          'Deactivated users cannot log in',
          'Consider reassignments before deactivating',
        ],
      },
    ],
  },
  {
    id: 'companies',
    title: 'Company Management',
    category: 'admin',
    description: 'Managing company profiles and multi-company configurations.',
    sections: [
      {
        title: 'Overview',
        content: 'The Companies module manages organizational profiles. The system supports parent-child company relationships for franchises or affiliated firms.',
      },
      {
        title: 'Company Information',
        content: 'Maintain company profile data.',
        steps: [
          'Navigate to Companies in Administration',
          'Select your company',
          'Update business information',
          'Set address and contact details',
          'Configure company settings',
        ],
      },
      {
        title: 'Multi-Company Setup',
        content: 'For organizations with multiple entities.',
        steps: [
          'Create parent company first',
          'Add child companies linked to parent',
          'Set data visibility rules',
          'Assign staff to appropriate companies',
          'Configure which data is shared',
        ],
      },
      {
        title: 'Data Visibility',
        content: 'Control data sharing between related companies.',
        steps: [
          'Own Only - See only your company data',
          'Parent View - Parent sees child data',
          'Full Share - All related companies share data',
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'System Settings',
    category: 'admin',
    description: 'Configuring user preferences and system options.',
    sections: [
      {
        title: 'Profile Settings',
        content: 'Update your personal profile.',
        steps: [
          'Navigate to Settings',
          'View your current profile',
          'Note: Core profile data is managed by administrators',
        ],
      },
      {
        title: 'Appearance Settings',
        content: 'Customize the application appearance.',
        steps: [
          'Navigate to Settings > Appearance',
          'Toggle dark mode',
          'Preferences are saved automatically',
        ],
      },
      {
        title: 'Company Settings',
        content: 'Configure company-wide options (Admin only).',
        steps: [
          'Navigate to Settings > Company',
          'Update business information',
          'Configure default values',
          'Set notification preferences',
        ],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notification Center',
    category: 'workflow',
    description: 'Real-time notifications for system events with configurable preferences.',
    sections: [
      {
        title: 'Overview',
        content: 'The Notification Center provides real-time alerts for important system events. Notifications appear in the bell icon dropdown in the top navigation bar and update automatically as new events occur.',
      },
      {
        title: 'Notification Types',
        content: 'The system generates notifications for various events:',
        steps: [
          'Task Assigned - When a task is assigned to you',
          'Task Due Soon - Reminder for upcoming task deadlines',
          'Task Overdue - Alert when tasks pass their due date',
          'Lead Assigned - When a new lead is assigned to you',
          'Matter Assigned - When a litigation matter is assigned',
          'Hearing Reminder - Upcoming court hearing alerts',
          'Settlement Update - Changes to settlement status',
          'Mention - When someone mentions you in a note',
          'System Alert - Important system announcements',
        ],
      },
      {
        title: 'Viewing Notifications',
        content: 'Access your notifications from anywhere in the application.',
        steps: [
          'Click the bell icon in the top navigation bar',
          'View unread count on the badge',
          'Scroll through recent notifications',
          'Click a notification to navigate to the related item',
          'Unread notifications show a blue indicator',
        ],
        tips: [
          'Notifications update in real-time - no refresh needed',
          'Click "Mark all read" to clear the unread count',
          'Notifications are sorted by most recent first',
        ],
      },
      {
        title: 'Managing Notifications',
        content: 'Keep your notification list organized.',
        steps: [
          'Click a notification to mark it as read',
          'Use "Mark all read" to clear all unread indicators',
          'Notifications older than 30 days are automatically removed',
        ],
      },
      {
        title: 'Notification Preferences',
        content: 'Configure how you receive notifications for each type.',
        steps: [
          'Navigate to Settings > Notifications',
          'View the preference grid for all notification types',
          'Toggle In-App to show/hide notifications in the dropdown',
          'Toggle Sound to enable/disable notification sounds',
          'Email notifications (future feature) can be enabled per type',
        ],
        tips: [
          'You can disable notifications for types you don\'t need',
          'Sound preferences only affect browser notifications',
          'Preferences are saved automatically when changed',
        ],
      },
    ],
  },
  {
    id: 'lead-scoring',
    title: 'Lead Scoring',
    category: 'workflow',
    description: 'Automatic lead prioritization using configurable scoring profiles.',
    sections: [
      {
        title: 'Overview',
        content: 'The Lead Scoring system automatically calculates priority scores for leads based on configurable criteria. Higher scores indicate leads with greater potential, helping sales reps focus on the most promising opportunities.',
      },
      {
        title: 'Understanding Lead Scores',
        content: 'Scores range from 0-100 and are color-coded for quick identification:',
        steps: [
          'Cold (0-30) - Gray badge, needs qualification',
          'Warm (31-50) - Yellow badge, moderate potential',
          'Hot (51-70) - Orange badge, high potential',
          'Very Hot (71-100) - Green badge with flame icon, priority lead',
        ],
        tips: [
          'Scores update automatically when lead data changes',
          'Hover over a score badge to see the breakdown',
          'Leads are sorted by score by default in list view',
        ],
      },
      {
        title: 'Score Factors',
        content: 'Default scoring criteria consider multiple factors:',
        steps: [
          'Estimated Debt Amount - Higher debt = more points',
          'Number of Debts - Multiple debts = higher priority',
          'Active Lawsuit - Litigation leads get bonus points',
          'Credit Authorization - Given authorization = bonus points',
          'Contact Info - Email and phone provided = bonus points',
          'Lead Source - Referrals score highest, ads score lower',
        ],
      },
      {
        title: 'Where Scores Appear',
        content: 'Lead scores are visible throughout the application.',
        steps: [
          'Kanban board - Score badge on each lead card',
          'List view - Score column with sortable header',
          'Lead detail sheet - Full score breakdown card',
          'Dashboards - High-score leads highlighted',
        ],
      },
      {
        title: 'Managing Scoring Profiles',
        content: 'Administrators can create and manage scoring profiles.',
        steps: [
          'Navigate to Settings > Scoring',
          'View all scoring profiles for your company',
          'Click "New Profile" to create a custom profile',
          'Set a name and optional description',
          'Choose interest type/source targeting (optional)',
          'Configure scoring criteria with point values',
          'Save the profile',
        ],
        tips: [
          'One profile per company can be marked as Default',
          'Profiles can target specific lead sources or interest types',
          'More specific profiles take precedence over general ones',
        ],
        warnings: [
          'Deleting a profile causes affected leads to use the default',
          'Changes to profiles recalculate scores on next lead update',
        ],
      },
      {
        title: 'Scoring Criteria Configuration',
        content: 'Each profile contains configurable point values:',
        steps: [
          'Debt Thresholds - Set tiers (e.g., $10k=10pts, $25k=20pts, $50k+=30pts)',
          'Number of Debts - Set tiers based on debt count',
          'Active Lawsuit - Points for litigation-interested leads',
          'Credit Auth - Points when authorization is given',
          'Contact Info - Points for email/phone provided',
          'Source Quality - Different points per lead source',
        ],
      },
    ],
  },
];

export function getGuideById(id: string): FeatureGuide | undefined {
  return FEATURE_GUIDES.find(g => g.id === id);
}

export function getGuidesByCategory(category: FeatureGuide['category']): FeatureGuide[] {
  return FEATURE_GUIDES.filter(g => g.category === category);
}
