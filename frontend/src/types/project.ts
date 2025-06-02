// Project Status enum
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  PENDING_VALIDATION: 'pending_validation',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
  PUBLISHED: 'published'
} as const;

// Contributor Status enum
export const CONTRIBUTOR_STATUS = {
  NOMINATED: 'nominated',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REQUESTED: 'requested'
} as const;

// Contribution Status enum
export const CONTRIBUTION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  VALIDATED: 'validated',
  REJECTED: 'rejected'
} as const;

// Project type
export interface Project {
  id: string;
  title: string;
  description: string;
  objectives?: string;
  targetGroups?: string;
  createdByUserId: string;
  createdByOrgId: string;
  createdByOrgName?: string;
  createdByUserName?: string;
  status: typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];
  plannedStartDate?: string;
  plannedEndDate?: string;
  locations?: Array<{
    name: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  }>;
  sectors?: Array<{
    code: string;
    name: string;
    percentage?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Project Contributor type
export interface ProjectContributor {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  status: typeof CONTRIBUTOR_STATUS[keyof typeof CONTRIBUTOR_STATUS];
  nominatedBy: string;
  nominatedByName: string;
  nominatedAt: string;
  respondedAt?: string;
  canEditOwnData: boolean;
  canViewOtherDrafts: boolean;
  canValidate: boolean;
  emailNotifications: boolean;
  systemNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

// Project Transaction type
export interface ProjectTransaction {
  id: string;
  projectId: string;
  contributorOrgId: string;
  contributorOrgName: string;
  type: string;
  value: number;
  currency: string;
  transactionDate: string;
  financingInstrument: string;
  flowType: string;
  tiedStatus?: string;
  aidType?: string;
  providerOrg: string;
  receiverOrg: string;
  narrative?: string;
  status: typeof CONTRIBUTION_STATUS[keyof typeof CONTRIBUTION_STATUS];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
} 