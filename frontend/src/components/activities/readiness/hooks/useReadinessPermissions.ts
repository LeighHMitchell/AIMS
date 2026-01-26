import { useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { useUserRole } from '@/hooks/useUserRole';

export interface ReadinessPermissions {
  // View permissions
  canView: boolean;
  
  // Edit permissions
  canEdit: boolean;
  canUpdateConfig: boolean;
  canUpdateResponses: boolean;
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canSignOff: boolean;
  
  // Admin permissions
  canManageTemplates: boolean;
  canManageItems: boolean;
  canRemoveSignoffs: boolean;
  
  // Read-only mode
  isReadOnly: boolean;
  
  // User context
  isGovernmentUser: boolean;
  isDevelopmentPartner: boolean;
}

/**
 * Hook for determining user permissions for the readiness checklist
 * 
 * Permission rules:
 * - Government users: Full edit access
 * - Development partners: Read-only view
 * - Admins: Can manage templates/items and remove sign-offs
 */
export function useReadinessPermissions(): ReadinessPermissions {
  const { user, organization } = useUser();
  const { isGovernmentPartner, isDevelopmentPartner, isAdmin, isSuperUser } = useUserRole();

  const permissions = useMemo<ReadinessPermissions>(() => {
    // Not logged in
    if (!user) {
      return {
        canView: false,
        canEdit: false,
        canUpdateConfig: false,
        canUpdateResponses: false,
        canUploadDocuments: false,
        canDeleteDocuments: false,
        canSignOff: false,
        canManageTemplates: false,
        canManageItems: false,
        canRemoveSignoffs: false,
        isReadOnly: true,
        isGovernmentUser: false,
        isDevelopmentPartner: false,
      };
    }

    const isGovUser = isGovernmentPartner();
    const isDevPartner = isDevelopmentPartner();
    const hasAdminAccess = isAdmin() || isSuperUser();

    // Government users get full edit access
    // Development partners get read-only view
    // Admins get additional template management capabilities
    const canEdit = isGovUser || hasAdminAccess;

    return {
      // View - everyone can view
      canView: true,
      
      // Edit - government users and admins
      canEdit,
      canUpdateConfig: canEdit,
      canUpdateResponses: canEdit,
      canUploadDocuments: canEdit,
      canDeleteDocuments: canEdit,
      canSignOff: isGovUser, // Only government can sign off
      
      // Admin only
      canManageTemplates: hasAdminAccess,
      canManageItems: hasAdminAccess,
      canRemoveSignoffs: hasAdminAccess,
      
      // Read-only mode for development partners
      isReadOnly: !canEdit,
      
      // User type flags
      isGovernmentUser: isGovUser,
      isDevelopmentPartner: isDevPartner,
    };
  }, [user, isGovernmentPartner, isDevelopmentPartner, isAdmin, isSuperUser]);

  return permissions;
}

/**
 * Hook to check if the readiness checklist tab should be visible
 */
export function useReadinessVisibility(): { isVisible: boolean; reason?: string } {
  const { user } = useUser();
  const { isGovernmentPartner, isDevelopmentPartner, isAdmin, isSuperUser } = useUserRole();

  return useMemo(() => {
    if (!user) {
      return { isVisible: false, reason: 'Not authenticated' };
    }

    // Visible to government users, development partners (read-only), and admins
    const isGov = isGovernmentPartner();
    const isDevPartner = isDevelopmentPartner();
    const isAdminUser = isAdmin() || isSuperUser();

    if (isGov || isDevPartner || isAdminUser) {
      return { isVisible: true };
    }

    return { isVisible: false, reason: 'User role does not have access' };
  }, [user, isGovernmentPartner, isDevelopmentPartner, isAdmin, isSuperUser]);
}
