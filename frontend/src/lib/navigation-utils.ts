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
 *
 * Cross-platform routes (/faq, /build-history, /admin, etc.) don't belong to
 * a single module. When the user navigates to one of these from Project Bank
 * or Land Bank the sidebar should stay in the originating module — not snap
 * to AIMS.  We persist the last "real" module in sessionStorage so these
 * shared routes inherit context.
 */
export type AetherModule = 'home' | 'project-bank' | 'land-bank' | 'aims';

/** Routes that exist in every module's sidebar — they should not force a module switch. */
const CROSS_PLATFORM_ROUTES = ['/faq', '/build-history', '/admin'];

const MODULE_STORAGE_KEY = 'aether_last_module';

function isCrossPlatform(pathname: string): boolean {
  return CROSS_PLATFORM_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
}

export function getCurrentModule(pathname: string | null): AetherModule {
  if (!pathname) return 'aims';

  // Explicit module roots
  if (pathname.startsWith('/project-bank')) {
    persistModule('project-bank');
    return 'project-bank';
  }
  if (pathname.startsWith('/land-bank')) {
    persistModule('land-bank');
    return 'land-bank';
  }
  if (pathname === '/home') return 'home';

  // Cross-platform routes → keep the module the user came from
  if (isCrossPlatform(pathname)) {
    const stored = readPersistedModule();
    if (stored) return stored;
  }

  // All other AIMS-specific routes
  persistModule('aims');
  return 'aims';
}

function persistModule(mod: AetherModule) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MODULE_STORAGE_KEY, mod);
  } catch {}
}

function readPersistedModule(): AetherModule | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(MODULE_STORAGE_KEY);
    if (v === 'project-bank' || v === 'land-bank' || v === 'aims') return v;
  } catch {}
  return null;
}
