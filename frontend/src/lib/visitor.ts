import { User, USER_ROLES } from '@/types/user';

/**
 * Synthetic user object for visitor mode.
 * Stored in UserProvider context so existing permission checks work automatically.
 */
export const VISITOR_USER: User = {
  id: 'visitor',
  email: '',
  name: 'Visitor',
  firstName: 'Visitor',
  role: USER_ROLES.VISITOR,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Check if a user is the synthetic visitor user.
 * Accepts any object with an id or role field for flexibility across components.
 */
export function isVisitorUser(user: { id?: string; role?: string } | null | undefined): boolean {
  return user?.id === 'visitor' || user?.role === USER_ROLES.VISITOR;
}

/**
 * Path patterns that visitors cannot access.
 * Covers edit/create pages, admin, and personal pages.
 */
const VISITOR_BLOCKED_PATH_PATTERNS = [
  /\/new(\/|$)/,        // Any /new route (activities/new, organizations/new, etc.)
  /\/edit(\/|$)/,        // Any /edit route
  /^\/admin/,            // Admin pages
  /^\/profile/,          // User profile
  /^\/iati-import/,      // IATI import
  /^\/notifications/,    // Notifications redirect
  /^\/activity-logs/,    // User activity logs
];

/**
 * Dashboard tabs that are personal and off-limits to visitors.
 */
export const VISITOR_BLOCKED_DASHBOARD_TABS = [
  'my-portfolio',
  'my-team',
  'notifications',
  'bookmarks',
  'tasks',
];

/**
 * Check if a given path is blocked for visitors.
 */
export function isPathBlockedForVisitor(pathname: string, searchParams?: URLSearchParams): boolean {
  // Check path patterns
  for (const pattern of VISITOR_BLOCKED_PATH_PATTERNS) {
    if (pattern.test(pathname)) return true;
  }

  // Check dashboard tab params
  if (pathname === '/dashboard' && searchParams) {
    const tab = searchParams.get('tab');
    if (tab && VISITOR_BLOCKED_DASHBOARD_TABS.includes(tab)) return true;
  }

  return false;
}

/**
 * Enter visitor mode: set synthetic user, localStorage markers, and cookie for middleware.
 */
export function enterVisitorMode(setUser: (user: User) => void) {
  setUser(VISITOR_USER);
  localStorage.setItem('aims_user', JSON.stringify(VISITOR_USER));
  localStorage.setItem('aims_auth_source', 'visitor');
  // Set cookie for middleware route protection
  document.cookie = 'aims_visitor_mode=true; path=/; SameSite=Lax';
}

/**
 * Exit visitor mode: clear all visitor state.
 */
export function exitVisitorMode(setUser: (user: User | null) => void) {
  setUser(null);
  localStorage.removeItem('aims_user');
  localStorage.removeItem('aims_auth_source');
  // Clear the visitor cookie
  document.cookie = 'aims_visitor_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
