import { User, USER_ROLES } from '@/types/user';

export interface ActivityContributor {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationAcronym?: string;
  status: 'nominated' | 'accepted' | 'declined' | 'requested';
  role: 'funder' | 'implementer' | 'coordinator' | 'contributor' | 'partner';
  displayOrder?: number;
  nominatedBy: string;
  nominatedByName: string;
  nominatedAt: string;
  respondedAt?: string;
  canEditOwnData: boolean;
  canViewOtherDrafts: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  createdByOrg?: string;
  contributors?: ActivityContributor[];
  submissionStatus: 'draft' | 'submitted' | 'validated' | 'rejected' | 'published';
  createdBy?: { id: string; name: string; role: string };
  [key: string]: any;
}

export interface ActivityPermissions {
  canEditActivity: boolean;
  canValidateActivity: boolean;
  canRejectActivity: boolean;
  canNominateContributors: boolean;
  canEditOwnContributions: boolean;
  canViewOtherContributions: boolean;
  canEditOtherContributions: boolean;
  canRequestToJoin: boolean;
  canApproveJoinRequests: boolean;
}

// Check if user is from a government organization
export function isGovernmentUser(user: User | null): boolean {
  if (!user) return false;
  return user.role === USER_ROLES.GOV_PARTNER_TIER_1 || 
         user.role === USER_ROLES.GOV_PARTNER_TIER_2 ||
         user.role === USER_ROLES.SUPER_USER;
}

// Check if user is the activity creator
export function isActivityCreator(user: User | null, activity: Activity): boolean {
  if (!user) return false;
  return activity.createdBy?.id === user.id;
}

// Check if user's organization is a contributor
export function isActivityContributor(user: User | null, activity: Activity): boolean {
  if (!user || !user.organizationId || !activity.contributors) return false;
  return activity.contributors.some(c => 
    c.organizationId === user.organizationId && 
    c.status === 'accepted'
  );
}

// Get activity permissions for a user
export function getActivityPermissions(
  user: User | null, 
  activity: Activity | null
): ActivityPermissions {
  // No permissions for non-authenticated users
  if (!user) {
    return {
      canEditActivity: false,
      canValidateActivity: false,
      canRejectActivity: false,
      canNominateContributors: false,
      canEditOwnContributions: false,
      canViewOtherContributions: false,
      canEditOtherContributions: false,
      canRequestToJoin: false,
      canApproveJoinRequests: false,
    };
  }

  const isGovUser = isGovernmentUser(user);
  const isCreator = activity ? isActivityCreator(user, activity) : false;
  const isContributor = activity ? isActivityContributor(user, activity) : false;
  const isSuperUser = user.role === USER_ROLES.SUPER_USER;

  return {
    // Edit activity metadata (title, description, etc.)
    canEditActivity: isSuperUser || isCreator || (isGovUser && activity?.submissionStatus === 'draft'),
    
    // Validation permissions (government users only)
    canValidateActivity: isGovUser && activity?.submissionStatus === 'submitted',
    canRejectActivity: isGovUser && activity?.submissionStatus === 'submitted',
    
    // Contributor management
    canNominateContributors: isCreator || isSuperUser,
    
    // Contribution permissions
    canEditOwnContributions: (isContributor || isCreator) && activity?.submissionStatus !== 'validated',
    canViewOtherContributions: isCreator || isGovUser || isSuperUser,
    canEditOtherContributions: isSuperUser,
    
    // Join request permissions
    canRequestToJoin: !isContributor && !isCreator && user.role !== USER_ROLES.ORPHAN,
    canApproveJoinRequests: isCreator || isGovUser || isSuperUser,
  };
}

// Check if a user can edit a specific transaction
export function canEditTransaction(
  user: User | null,
  transactionOrgId: string,
  activity: Activity
): boolean {
  if (!user || !user.organizationId) return false;
  
  const permissions = getActivityPermissions(user, activity);
  
  // Super users can edit all
  if (permissions.canEditOtherContributions) return true;
  
  // Users can only edit their organization's transactions
  if (permissions.canEditOwnContributions && 
      transactionOrgId === user.organizationId) {
    return true;
  }
  
  return false;
}

// Check if a user can view a specific contribution
export function canViewContribution(
  user: User | null,
  contributionOrgId: string,
  activity: Activity
): boolean {
  if (!user || !user.organizationId) return false;
  
  const permissions = getActivityPermissions(user, activity);
  
  // Can view other contributions
  if (permissions.canViewOtherContributions) return true;
  
  // Can only view own contributions
  return contributionOrgId === user.organizationId;
} 