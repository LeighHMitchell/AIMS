"use client"

import React, { useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AuthGuard } from "@/components/AuthGuard"
import { useUser } from "@/hooks/useUser"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { SidebarNav } from "@/components/navigation/SidebarNav"
import { TopNav } from "@/components/navigation/TopNav"
import { VersionBadge } from "@/components/ui/version-badge"
import { useSmartPreCache } from "@/hooks/use-pre-cached-data"
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch"
import { getHomeRoute } from "@/lib/navigation-utils"
import { TourOverlay } from "@/components/tour/TourOverlay"
import { isVisitorUser, exitVisitorMode } from "@/lib/visitor"
import { UserPlus, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHelpBubble } from "@/components/help/PageHelpBubble"
import { resolvePageHelp } from "@/lib/help-page-slugs"

interface MainLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function MainLayout({ children, requireAuth = true }: MainLayoutProps) {
  const { user, permissions, logout, isLoading, setUser } = useUser();
  const isVisitor = isVisitorUser(user);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize smart pre-caching based on current path (data caching)
  useSmartPreCache(pathname || '');

  // Initialize route prefetching (page bundle caching)
  useRoutePrefetch({ enabled: true, prefetchUserOrg: true });

  // Check if user is currently in the activity editor
  const isInActivityEditor = pathname?.includes('/activities/new') ||
                            (pathname?.includes('/activities/') && pathname?.includes('/edit'));

  const sidebarWidth = 'w-72';
  const mainMargin = 'ml-72';
  
  // Get the home route based on whether user has an organization
  const homeRoute = getHomeRoute(user);

  // Persist sidebar scroll position across navigations.
  //
  // MainLayout is mounted per-page (87 pages) and the scroll container lives
  // inside <AuthGuard>, which renders its own loading state before children.
  // That means a normal mount effect runs while the <aside> doesn't exist yet
  // (ref is null) and never re-runs when it finally mounts — so save/restore
  // silently never happen. A *callback ref* fixes this: React invokes it exactly
  // when the scroll <div> attaches (after its nav content has mounted) and again
  // with null on unmount, so restore + the scroll listener are wired up reliably
  // regardless of AuthGuard timing. Restoring inside the ref callback runs during
  // the commit phase (before paint), so the sidebar is never shown at the top.
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollHandlerRef = useRef<(() => void) | null>(null);
  const SIDEBAR_SCROLL_KEY = 'sidebar-scroll-top';

  const setSidebarScrollEl = useCallback((el: HTMLDivElement | null) => {
    // Detach from any previous element first.
    if (sidebarScrollRef.current && scrollHandlerRef.current) {
      sidebarScrollRef.current.removeEventListener('scroll', scrollHandlerRef.current);
      scrollHandlerRef.current = null;
    }
    sidebarScrollRef.current = el;
    if (!el) return;

    // Restore the saved position as soon as the element (and its nav content) mount.
    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved) el.scrollTop = Number(saved);

    // Save position on user scroll.
    const handleScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(el.scrollTop));
    };
    scrollHandlerRef.current = handleScroll;
    el.addEventListener('scroll', handleScroll, { passive: true });
  }, []);

  // Safety net for the very first load, where the nav may mount as a short
  // skeleton (isLoading) and then grow: re-apply the saved position when loading
  // finishes, but only if the user hasn't scrolled away from the top yet.
  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el || isLoading) return;
    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved && el.scrollTop === 0) el.scrollTop = Number(saved);
  }, [isLoading]);

  const content = (
    <div className="flex h-screen overflow-hidden bg-background border-0">
      <TourOverlay />
      {/* Fixed Sidebar */}
      <aside
        className={`${sidebarWidth} flex-shrink-0 border-r h-full fixed top-0 left-0 z-40 flex flex-col bg-surface-muted`}
      >
        {/* Logo Section */}
        <div className="py-3 px-4 flex-shrink-0 bg-surface-muted">
          <Link href={homeRoute} className="flex items-center hover:opacity-80 transition-opacity duration-200">
            <img
              src="/images/Logo - No Text 2.jpeg"
              alt="æther logo"
              className="h-12 w-12 object-contain flex-shrink-0 mr-4"
            />
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="text-xl font-bold whitespace-nowrap">
                  æther
                </span>
                <span className="text-body font-medium text-muted-foreground ml-2">
                  MYANMAR
                </span>
              </div>
              <VersionBadge />
            </div>
          </Link>
        </div>

        {/* Hydration-safe Navigation - flex-1 to take remaining space */}
        <div ref={setSidebarScrollEl} className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav
            userRole={user?.role}
            canManageUsers={permissions.canManageUsers}
            canCreateActivities={permissions.canCreateActivities}
            canCreateProjects={permissions.canCreateProjects}
            canCreateParcels={permissions.canCreateParcels}
            isInActivityEditor={isInActivityEditor}
            isLoading={isLoading}
            isCollapsed={false}
            isInitialLoad={false}
          />
        </div>
      </aside>

      {/* Main Content Area with left margin */}
      <main
        className={`flex-1 ${mainMargin} overflow-y-auto relative scrollbar-thin scrollbar-track-transparent`}
      >
        {/* Hydration-safe Top Navigation */}
        <TopNav 
          key={user?.profilePicture || 'no-profile-pic'} 
          user={user}
          onLogout={logout}
        />

        {/* Visitor Banner */}
        {isVisitor && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
            <p className="text-body text-amber-800">
              You are browsing as a visitor. Sign up for full access to create and manage activities.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-800 hover:text-amber-900 hover:bg-amber-100"
                onClick={() => {
                  exitVisitorMode(setUser);
                  router.push('/login');
                }}
              >
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Sign In
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  exitVisitorMode(setUser);
                  router.push('/register');
                }}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Create Account
              </Button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="pt-8 px-8 pb-24 border-0">
          {children}
        </div>
      </main>

      {/* Contextual Page Help bubble — renders only on pages registered in help-page-slugs */}
      {!isVisitor && (() => {
        const pageHelp = resolvePageHelp(pathname);
        if (!pageHelp) return null;
        return <PageHelpBubble pageSlug={pageHelp.slug} pageTitle={pageHelp.title} />;
      })()}
    </div>
  );

  // Wrap with AuthGuard if authentication is required
  const wrappedContent = <ErrorBoundary>{content}</ErrorBoundary>;
  return requireAuth ? <AuthGuard>{wrappedContent}</AuthGuard> : wrappedContent;
} 