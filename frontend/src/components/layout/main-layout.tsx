"use client"

import React, { useRef, useEffect } from "react"
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

  // Persist sidebar scroll position across navigations
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const SIDEBAR_SCROLL_KEY = 'sidebar-scroll-top';

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;

    // Restore scroll position on mount
    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved) {
      el.scrollTop = Number(saved);
    }

    // Save scroll position on scroll
    const handleScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(el.scrollTop));
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

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
        <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
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