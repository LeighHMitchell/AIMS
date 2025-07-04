import { useUser } from "@/hooks/useUser"
import { UserRole, USER_ROLES } from "@/types/user"

export function useUserRole() {
  const { user, permissions } = useUser()

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false
    
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role as UserRole)
  }

  const isSuperUser = (): boolean => {
    return hasRole(USER_ROLES.SUPER_USER)
  }

  const isAdmin = (): boolean => {
    // In this system, only super_user has admin privileges
    return hasRole(USER_ROLES.SUPER_USER)
  }

  const isDevelopmentPartner = (): boolean => {
    return hasRole([USER_ROLES.DEV_PARTNER_TIER_1, USER_ROLES.DEV_PARTNER_TIER_2])
  }

  const isGovernmentPartner = (): boolean => {
    return hasRole([USER_ROLES.GOV_PARTNER_TIER_1, USER_ROLES.GOV_PARTNER_TIER_2])
  }

  const isTier1 = (): boolean => {
    return hasRole([USER_ROLES.DEV_PARTNER_TIER_1, USER_ROLES.GOV_PARTNER_TIER_1])
  }

  const isTier2 = (): boolean => {
    return hasRole([USER_ROLES.DEV_PARTNER_TIER_2, USER_ROLES.GOV_PARTNER_TIER_2])
  }

  const isOrphan = (): boolean => {
    // Orphan role has been deprecated
    return false
  }

  const canAccessAdmin = (): boolean => {
    return isSuperUser()
  }

  const canEditSettings = (): boolean => {
    // All authenticated users can edit their own settings
    return !!user
  }

  const canViewNotifications = (): boolean => {
    // All authenticated users can view notifications
    return !!user
  }

  return {
    user,
    permissions,
    hasRole,
    isSuperUser,
    isAdmin,
    isDevelopmentPartner,
    isGovernmentPartner,
    isTier1,
    isTier2,
    isOrphan,
    canAccessAdmin,
    canEditSettings,
    canViewNotifications,
  }
} 