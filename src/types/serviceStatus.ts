// Multi-dimensional service status types

// Primary Status (Lifecycle)
export type PrimaryServiceStatus = 'pending' | 'active' | 'graduated' | 'dropped' | 'cancelled';

// Payment Status (Financial State - only relevant when primary status is 'active')
export type PaymentStatus = 'current' | 'paused' | 'nsf' | 'past_due' | 'suspended' | null;

// Retention Type (Cancellation risk reasons)
export type RetentionType = 'client_requested_cancel' | 'company_initiated_cancel' | 'at_risk' | 'churn_risk' | 'complaint' | null;

// Contact Status (Client reachability)
export type ContactStatus = 'reachable' | 'hard_to_reach' | 'unreachable' | 'no_contact_allowed';

// Client Status (derived from services)
export type ClientStatus = 'active' | 'inactive';

// Status configuration for UI rendering
export const primaryStatusConfig: Record<PrimaryServiceStatus, { label: string; className: string; description: string }> = {
  pending: { 
    label: 'Pending', 
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    description: 'Agreement signed, not yet started'
  },
  active: { 
    label: 'Active', 
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    description: 'Service currently running'
  },
  graduated: { 
    label: 'Graduated', 
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    description: 'Successfully completed program'
  },
  dropped: { 
    label: 'Dropped', 
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Client stopped participating'
  },
  cancelled: { 
    label: 'Cancelled', 
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    description: 'Formally cancelled'
  },
};

export const paymentStatusConfig: Record<NonNullable<PaymentStatus>, { label: string; className: string; description: string }> = {
  current: { 
    label: 'Current', 
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    description: 'Payments up to date'
  },
  paused: { 
    label: 'Paused', 
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    description: 'Temporarily paused'
  },
  nsf: { 
    label: 'NSF', 
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Failed payment, retry pending'
  },
  past_due: { 
    label: 'Past Due', 
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    description: 'Missed payments'
  },
  suspended: { 
    label: 'Suspended', 
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Processing stopped'
  },
};

export const retentionTypeConfig: Record<NonNullable<RetentionType>, { label: string; className: string; description: string }> = {
  client_requested_cancel: { 
    label: 'Client Cancel Request', 
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Client requested cancellation'
  },
  company_initiated_cancel: { 
    label: 'Company Cancel', 
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    description: 'Company initiated cancellation'
  },
  at_risk: { 
    label: 'At Risk', 
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    description: 'At risk of leaving'
  },
  churn_risk: { 
    label: 'Churn Risk', 
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    description: 'High churn probability'
  },
  complaint: { 
    label: 'Complaint', 
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Filed a complaint'
  },
};

export const contactStatusConfig: Record<ContactStatus, { label: string; className: string; description: string }> = {
  reachable: { 
    label: 'Reachable', 
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    description: 'Normal contact'
  },
  hard_to_reach: { 
    label: 'Hard to Reach', 
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    description: '3+ failed contact attempts'
  },
  unreachable: { 
    label: 'Unreachable', 
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: '5+ failed attempts or 60+ days no contact'
  },
  no_contact_allowed: { 
    label: 'No Contact', 
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    description: 'Client requested no contact'
  },
};

export const clientStatusConfig: Record<ClientStatus, { label: string; className: string }> = {
  active: { 
    label: 'Active', 
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  },
  inactive: { 
    label: 'Inactive', 
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  },
};
