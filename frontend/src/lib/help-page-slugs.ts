/**
 * Single source of truth mapping app routes to their Page Help slug + title.
 *
 * - `route` is matched against `usePathname()` using `routeMatches()` below.
 *   Dynamic segments can be expressed with a `*` wildcard (e.g. `/activities/*`
 *   matches `/activities/123/edit`). More specific routes should be listed
 *   BEFORE more general ones — the matcher stops at the first hit.
 * - `slug` is the stable key stored in `page_help_content.page_slug`.
 * - `title` is shown in the help card header and attached to Ask-a-Question
 *   submissions as `source_page_title`.
 *
 * To add a new page, add an entry here — no other wiring needed. The
 * `PageHelpBubble` mounted in MainLayout will pick it up.
 */

export interface PageHelpSlug {
  route: string;
  slug: string;
  title: string;
}

// Order matters: list most-specific routes first.
export const PAGE_HELP_SLUGS: readonly PageHelpSlug[] = [
  // --- Workspace / home ---
  { route: '/dashboard', slug: 'dashboard', title: 'Workspace' },

  // --- EXPLORE ---
  { route: '/analytics-dashboard', slug: 'analytics-dashboard', title: 'Dashboards' },
  { route: '/alignment', slug: 'alignment', title: 'Plan Alignment' },
  { route: '/atlas', slug: 'atlas', title: 'Atlas' },
  { route: '/search', slug: 'search', title: 'Search' },
  { route: '/partners', slug: 'partners', title: 'Development Partners' },
  { route: '/reports', slug: 'reports', title: 'Reports' },

  // --- ACTIVITIES ---
  // (Specific before general so `/activities/new` is caught first.)
  { route: '/activities/new', slug: 'activities/new', title: 'Activity Editor' },
  { route: '/activities', slug: 'activities', title: 'Activities' },
  { route: '/funds', slug: 'funds', title: 'Pooled Funds' },

  // --- FINANCES ---
  { route: '/transactions', slug: 'transactions', title: 'Transactions' },
  { route: '/planned-disbursements', slug: 'planned-disbursements', title: 'Planned Disbursements' },
  { route: '/budgets', slug: 'budgets', title: 'Budgets' },

  // --- ACTORS ---
  { route: '/organizations', slug: 'organizations', title: 'Organizations' },
  { route: '/rolodex', slug: 'rolodex', title: 'Rolodex' },

  // --- PROFILES ---
  { route: '/sdgs', slug: 'sdgs', title: 'SDGs' },
  { route: '/sectors', slug: 'sectors', title: 'Sectors' },
  { route: '/location-profiles', slug: 'location-profiles', title: 'Locations' },
  { route: '/policy-markers', slug: 'policy-markers', title: 'Policy Markers' },
  { route: '/working-groups', slug: 'working-groups', title: 'Working Groups' },

  // --- ADVANCED ---
  { route: '/transparency-index', slug: 'transparency-index', title: 'Transparency Index' },
  { route: '/aid-effectiveness-dashboard', slug: 'aid-effectiveness-dashboard', title: 'Aid Effectiveness' },

  // --- OPERATIONS ---
  { route: '/calendar', slug: 'calendar', title: 'Calendar' },
  { route: '/data-clinic', slug: 'data-clinic', title: 'Data Clinic' },
  { route: '/library', slug: 'library', title: 'Library' },
  { route: '/build-history', slug: 'build-history', title: 'Build History' },
  { route: '/iati-import', slug: 'iati-import', title: 'IATI Import' },

  // --- SUPPORT ---
  { route: '/faq', slug: 'faq', title: 'FAQ' },

  // --- PROJECT BANK ---
  // Specific routes before /project-bank root.
  { route: '/project-bank/projects', slug: 'project-bank/projects', title: 'Project Bank — Project List' },
  { route: '/project-bank/gaps', slug: 'project-bank/gaps', title: 'Project Bank — Funding Gaps' },
  { route: '/project-bank/review', slug: 'project-bank/review', title: 'Project Bank — Review Board' },
  { route: '/project-bank/monitoring', slug: 'project-bank/monitoring', title: 'Project Bank — Monitoring' },
  { route: '/project-bank/transfers', slug: 'project-bank/transfers', title: 'Project Bank — Transfers' },
  { route: '/project-bank', slug: 'project-bank', title: 'Project Bank — Dashboard' },

  // --- LAND BANK ---
  { route: '/land-bank/parcels', slug: 'land-bank/parcels', title: 'Land Bank — Parcels' },
  { route: '/land-bank/import', slug: 'land-bank/import', title: 'Land Bank — Import' },
  { route: '/land-bank/analytics', slug: 'land-bank/analytics', title: 'Land Bank — Analytics' },
  { route: '/land-bank', slug: 'land-bank', title: 'Land Bank — Dashboard' },
] as const;

/**
 * Resolve the current pathname to a PageHelpSlug entry. Returns null if the
 * current route has no registered help content.
 */
export function resolvePageHelp(pathname: string | null | undefined): PageHelpSlug | null {
  if (!pathname) return null;

  // Strip trailing slash (except for root)
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

  for (const entry of PAGE_HELP_SLUGS) {
    if (routeMatches(entry.route, normalized)) return entry;
  }
  return null;
}

function routeMatches(route: string, pathname: string): boolean {
  if (route === pathname) return true;
  if (route.endsWith('/*')) {
    const prefix = route.slice(0, -2);
    return pathname === prefix || pathname.startsWith(prefix + '/');
  }
  return false;
}

/**
 * Admin UI dropdown options — stable list of all registered slugs.
 */
export function listHelpPageOptions(): Array<{ slug: string; title: string }> {
  return PAGE_HELP_SLUGS.map(({ slug, title }) => ({ slug, title }));
}
