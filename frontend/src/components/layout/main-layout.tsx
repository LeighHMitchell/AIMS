"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/AuthGuard"
import { useUser } from "@/hooks/useUser"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { SidebarNav } from "@/components/navigation/SidebarNav"
import { TopNav } from "@/components/navigation/TopNav"
import { useSmartPreCache } from "@/hooks/use-pre-cached-data"
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch"

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

  const content = (
    <div className="flex h-screen overflow-hidden bg-background border-0">
      {/* Fixed Sidebar */}
      <aside
        className={`${sidebarWidth} flex-shrink-0 border-r h-full fixed z-40 flex flex-col`}
        style={{
          backgroundColor: '#F0EEE9'
        }}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-4 flex-shrink-0" style={{ backgroundColor: '#F0EEE9' }}>
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity duration-200">
            <img
              src="/images/Logo - No Text 2.jpeg"
              alt="æther logo"
              className="h-12 w-12 object-contain flex-shrink-0 mr-4"
            />
            <span className="text-xl font-bold whitespace-nowrap">
              æther
            </span>
          </Link>
        </div>

        {/* Hydration-safe Navigation - flex-1 to take remaining space */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav
            userRole={user?.role}
            canManageUsers={permissions.canManageUsers}
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
          canCreateActivities={permissions.canCreateActivities}
          isInActivityEditor={isInActivityEditor}
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