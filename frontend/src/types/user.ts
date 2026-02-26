export const USER_ROLES = {
  SUPER_USER: "super_user",
  DEV_PARTNER_TIER_1: "dev_partner_tier_1",
  DEV_PARTNER_TIER_2: "dev_partner_tier_2",
  GOV_PARTNER_TIER_1: "gov_partner_tier_1", 
  GOV_PARTNER_TIER_2: "gov_partner_tier_2",
  PUBLIC_USER: "public_user", // Read-only access for OAuth users
} as const;

export const ROLE_LABELS = {
  [USER_ROLES.SUPER_USER]: "Super User",
  [USER_ROLES.DEV_PARTNER_TIER_1]: "Development Partner - Tier 1",
  [USER_ROLES.DEV_PARTNER_TIER_2]: "Development Partner - Tier 2",
  [USER_ROLES.GOV_PARTNER_TIER_1]: "Government Partner - Tier 1",
  [USER_ROLES.GOV_PARTNER_TIER_2]: "Government Partner - Tier 2",
  [USER_ROLES.PUBLIC_USER]: "Public User",
  'admin': "Administrator", // Legacy admin role
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export interface Organization {
  id: string;
  name: string;
  acronym?: string;
  logo?: string;
  type: "development_partner" | "partner_government" | "bilateral" | "other";
  country?: string;
  iati_org_id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationPreferences {
  email: boolean;
  browser: boolean;
  activities: boolean;
  reports: boolean;
  security: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string; // Computed from first_name + last_name for backward compatibility
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  organisation?: string;
  department?: string;
  jobTitle?: string;
  telephone?: string;
  website?: string;
  mailingAddress?: string;
  // Address component fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  postalCode?: string;
  profilePicture?: string; // Data URL for profile image
  bio?: string;
  preferredLanguage?: string;
  timezone?: string;
  notifications?: UserNotificationPreferences;
  role: UserRole | 'admin'; // Allow 'admin' legacy role
  organizationId?: string;
  organization?: Organization; // Legacy - for backward compatibility
  title?: string; // Title (Mr., Mrs., Dr., etc.)
  suffix?: string; // Suffix (Jr., Sr., PhD, MD, etc.)
  phone?: string; // Legacy - replaced by telephone
  contactType?: string;
  faxNumber?: string;
  notes?: string;
  isActive: boolean;
  lastLogin?: string;
  authProvider?: 'email' | 'google' | 'apple'; // How the user authenticates
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  reportedByOrgId?: string;
}

export interface UserPermissions {
  canCreateActivities: boolean;
  canValidateActivities: boolean;
  canManageUsers: boolean;
  canManageOrganizations: boolean;
  canEditAllActivities: boolean;
  canViewAllActivities: boolean;
  canCreateProjects: boolean;
  canCreateParcels: boolean;
  canManageParcels: boolean;
  canRequestAllocation: boolean;
}

export function getUserPermissions(role: UserRole | string): UserPermissions {
  switch (role) {
    case USER_ROLES.SUPER_USER:
    case 'admin': // Handle legacy admin role
      return {
        canCreateActivities: true,
        canValidateActivities: true,
        canManageUsers: true,
        canManageOrganizations: true,
        canEditAllActivities: true,
        canViewAllActivities: true,
        canCreateProjects: true,
        canCreateParcels: true,
        canManageParcels: true,
        canRequestAllocation: true,
      };

    case USER_ROLES.GOV_PARTNER_TIER_1:
      return {
        canCreateActivities: true,
        canValidateActivities: true,
        canManageUsers: false,
        canManageOrganizations: false,
        canEditAllActivities: false,
        canViewAllActivities: false,
        canCreateProjects: true,
        canCreateParcels: true,
        canManageParcels: true,
        canRequestAllocation: false,
      };

    case USER_ROLES.GOV_PARTNER_TIER_2:
      return {
        canCreateActivities: true,
        canValidateActivities: false,
        canManageUsers: false,
        canManageOrganizations: false,
        canEditAllActivities: false,
        canViewAllActivities: false,
        canCreateProjects: true,
        canCreateParcels: true,
        canManageParcels: true,
        canRequestAllocation: false,
      };

    case USER_ROLES.DEV_PARTNER_TIER_1:
      return {
        canCreateActivities: true,
        canValidateActivities: true,
        canManageUsers: false,
        canManageOrganizations: false,
        canEditAllActivities: false,
        canViewAllActivities: false,
        canCreateProjects: true,
        canCreateParcels: false,
        canManageParcels: false,
        canRequestAllocation: true,
      };

    case USER_ROLES.DEV_PARTNER_TIER_2:
      return {
        canCreateActivities: true,
        canValidateActivities: false,
        canManageUsers: false,
        canManageOrganizations: false,
        canEditAllActivities: false,
        canViewAllActivities: false,
        canCreateProjects: true,
        canCreateParcels: false,
        canManageParcels: false,
        canRequestAllocation: true,
      };

    case USER_ROLES.PUBLIC_USER:
      return {
        canCreateActivities: false,
        canValidateActivities: false,
        canManageUsers: false,
        canManageOrganizations: false,
        canEditAllActivities: false,
        canViewAllActivities: true,
        canCreateProjects: false,
        canCreateParcels: false,
        canManageParcels: false,
        canRequestAllocation: false,
      };

    default:
      return {
        canCreateActivities: false,
        canValidateActivities: false,
        canManageUsers: false,
        canManageOrganizations: false,
        canEditAllActivities: false,
        canViewAllActivities: false,
        canCreateProjects: false,
        canCreateParcels: false,
        canManageParcels: false,
        canRequestAllocation: false,
      };
  }
} 