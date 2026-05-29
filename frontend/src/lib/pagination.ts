/**
 * Shared pagination constants — single source of truth so every paginated list
 * in the app offers the same "per page" choices and default page size.
 *
 * Used by the standard `FullPagination` component and every list page.
 */

/** Options shown in the "Per page" dropdown across all lists. */
export const PAGE_SIZE_OPTIONS = [20, 50, 100];

/** Default number of rows per page for any newly-loaded list. */
export const DEFAULT_PAGE_SIZE = 20;
