import { USER_ROLES } from "@/types/user";

/**
 * Unified role badge variant mapping for consistent colors across the application
 * This ensures all role badges use the same color scheme regardless of where they appear
 */
export function getRoleBadgeVariant(role: string | undefined | null): "default" | "secondary" | "destructive" | "outline" | "dark-blue" | "light-blue" | "dark-green" | "light-green" {
  if (!role) return "outline";
  
  // Super User - Red
  if (role === USER_ROLES.SUPER_USER || role === 'admin' || role === 'super_user') {
    return "destructive";
  }
  
  // Development Partner colors (blue shades)
  if (role === USER_ROLES.DEV_PARTNER_TIER_1 || role === 'dev_partner_tier_1' || role === 'development_partner_tier_1') {
    return "dark-blue";
  }
  if (role === USER_ROLES.DEV_PARTNER_TIER_2 || role === 'dev_partner_tier_2' || role === 'development_partner_tier_2') {
    return "light-blue";
  }
  
  // Government Partner colors (green shades)
  if (role === USER_ROLES.GOV_PARTNER_TIER_1 || role === 'gov_partner_tier_1' || role === 'government_partner_tier_1') {
    return "dark-green";
  }
  if (role === USER_ROLES.GOV_PARTNER_TIER_2 || role === 'gov_partner_tier_2' || role === 'government_partner_tier_2') {
    return "light-green";
  }
  
  // Public User - Gray/Secondary (read-only OAuth users)
  if (role === USER_ROLES.PUBLIC_USER || role === 'public_user') {
    return "secondary";
  }
  
  // Default for all other roles (organization roles, activity roles, etc.)
  return "outline";
}

/**
 * Get role display label with fallback formatting
 */
export function getRoleDisplayLabel(role: string | undefined | null): string {
  if (!role) return 'Unknown';
  
  // Import ROLE_LABELS dynamically to avoid circular dependencies
  const roleLabelsMap: Record<string, string> = {
    [USER_ROLES.SUPER_USER]: "Super User",
    [USER_ROLES.DEV_PARTNER_TIER_1]: "Data Submission",
    [USER_ROLES.DEV_PARTNER_TIER_2]: "Review & Approval", 
    [USER_ROLES.GOV_PARTNER_TIER_1]: "Government Partner Tier 1",
    [USER_ROLES.GOV_PARTNER_TIER_2]: "Government Partner Tier 2",
    [USER_ROLES.PUBLIC_USER]: "Public User",
    'admin': "Administrator",
    'development_partner_tier_1': "Data Submission", 
    'development_partner_tier_2': "Review & Approval",
    'government_partner_tier_1': "Government Partner Tier 1",
    'government_partner_tier_2': "Government Partner Tier 2",
    'public_user': "Public User",
    'orphan': "Unassigned User"
  };
  
  return roleLabelsMap[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
