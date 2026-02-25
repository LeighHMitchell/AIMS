import { User } from '@/types/user';

/**
 * Gets the appropriate home route — always the entry portal.
 */
export function getHomeRoute(user: User | null): string {
  return '/home';
}

/**
 * Gets the home route based on user data from API response (before user context is set)
 */
export function getHomeRouteFromApiData(userData: { organizationId?: string; organization_id?: string } | null): string {
  return '/home';
}

/**
 * Detects the current module from the pathname.
 */
export type AetherModule = 'home' | 'project-bank' | 'land-bank' | 'aims';

export function getCurrentModule(pathname: string | null): AetherModule {
  if (!pathname) return 'aims';
  if (pathname.startsWith('/project-bank')) return 'project-bank';
  if (pathname.startsWith('/land-bank')) return 'land-bank';
  if (pathname === '/home') return 'home';
  return 'aims';
}
