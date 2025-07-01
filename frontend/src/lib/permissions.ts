import { UserRole, USER_ROLES } from "@/types/user";

export function hasPermission(role: UserRole, permission: string): boolean {
  // This function is kept for backward compatibility
  // The actual permissions are now handled in getUserPermissions in the user types
  switch (permission) {
    case "canCreate":
      // All authenticated users can now create activities
  return true;
    case "canManageUsers":
      return role === USER_ROLES.SUPER_USER;
    default:
      return false;
  }
} 