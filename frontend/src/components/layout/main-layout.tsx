"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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

interface MainLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function MainLayout({ children, requireAuth = true }: MainLayoutProps) {
  const { user, permissions, logout, isLoading } = useUser();
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
                <span className="text-sm font-medium text-muted-foreground ml-2">
                  MYANMAR
                </span>
              </div>
              <VersionBadge />
            </div>
          </Link>
        </div>

        {/* Hydration-safe Navigation - flex-1 to take remaining space */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav
            userRole={user?.role}
            canManageUsers={permissions.canManageUsers}
            canCreateActivities={permissions.canCreateActivities}
            isInActivityEditor={isInActivityEditor}
            isLoading={isLoading}
            isCollapsed={false}
            isInitialLoad={false}
          />
        </div>
      </aside>

      {/* Main Content Area with left margin */}
      <main
        className={`flex-1 ${mainMargin} overflow-y-auto relative scrollbar-thin`}
      >
        {/* Hydration-safe Top Navigation */}
        <TopNav 
          key={user?.profilePicture || 'no-profile-pic'} 
          user={user}
          onLogout={logout}
        />

        {/* Page Content */}
        <div className="pt-8 px-8 border-0">
          {children}
        </div>
      </main>
    </div>
  );

  // Wrap with AuthGuard if authentication is required
  const wrappedContent = <ErrorBoundary>{content}</ErrorBoundary>;
  return requireAuth ? <AuthGuard>{wrappedContent}</AuthGuard> : wrappedContent;
} 