import { User } from '@/types/user';

/**
 * Gets the appropriate home route for a user based on whether they have an organization assigned.
 * - Users with an organization go to their dashboard
 * - Users without an organization go to the activity list
 */
export function getHomeRoute(user: User | null): string {
  if (user?.organizationId) {
    return '/dashboard';
  }
  return '/activities';
}

/**
 * Gets the home route based on user data from API response (before user context is set)
 * This is useful during login when we have the raw API response
 */
export function getHomeRouteFromApiData(userData: { organizationId?: string; organization_id?: string } | null): string {
  const orgId = userData?.organizationId || userData?.organization_id;
  if (orgId) {
    return '/dashboard';
  }
  return '/activities';
}
