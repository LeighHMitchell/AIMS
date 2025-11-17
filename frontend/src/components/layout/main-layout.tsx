"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/AuthGuard"
import { useUser } from "@/hooks/useUser"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { SidebarNav } from "@/components/navigation/SidebarNav"

import { TopNav } from "@/components/navigation/TopNav"
import { useSmartPreCache } from "@/hooks/use-pre-cached-data"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function MainLayout({ children, requireAuth = true }: MainLayoutProps) {
  const { user, permissions, logout, isLoading } = useUser();
  const pathname = usePathname();

  // Track if component has mounted
  const [mounted, setMounted] = useState(false);
  
  // Track if initial load is complete to enable transitions
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initialize sidebar collapsed state - always start false for consistent SSR/client render
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load saved state after mount and mark as ready for transitions
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    }
    // Enable transitions after state is loaded
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Save collapsed state to localStorage and sync across tabs (only after mounted)
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    }
  }, [isCollapsed, mounted]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed' && e.newValue !== null) {
        setIsCollapsed(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initialize smart pre-caching based on current path
  useSmartPreCache(pathname || '');

  // Check if user is currently in the activity editor
  const isInActivityEditor = pathname?.includes('/activities/new') || 
                            (pathname?.includes('/activities/') && pathname?.includes('/edit'));

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-72';
  const mainMargin = isCollapsed ? 'ml-20' : 'ml-72';

  const content = (
    <div className="flex h-screen overflow-hidden bg-background border-0">
      {/* Fixed Sidebar */}
      <aside 
        className={`${sidebarWidth} flex-shrink-0 border-r h-full fixed z-40 flex flex-col`} 
        style={{ 
          backgroundColor: '#F6F5F4',
          transition: isInitialLoad ? 'none' : 'width 400ms cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 300ms ease'
        }}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-4 flex-shrink-0" style={{ backgroundColor: '#F6F5F4' }}>
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity duration-200">
            <img 
              src="/images/Logo - No Text 2.jpeg" 
              alt="æther logo" 
              className="h-12 w-12 object-contain flex-shrink-0"
              style={{
                marginRight: isCollapsed ? '0' : '1rem',
                transition: isInitialLoad ? 'none' : 'margin-right 400ms cubic-bezier(0.4, 0.0, 0.2, 1)'
              }}
            />
            <span 
              className={cn(
                "text-xl font-bold whitespace-nowrap",
                isCollapsed 
                  ? "opacity-0 w-0 overflow-hidden" 
                  : "opacity-100 w-auto"
              )}
              style={{
                transitionProperty: isInitialLoad ? 'none' : 'opacity, width',
                transitionDuration: isCollapsed ? '200ms, 0ms' : '300ms, 0ms',
                transitionDelay: isCollapsed ? '0ms, 0ms' : '100ms, 0ms'
              }}
            >
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
            isCollapsed={isCollapsed}
            isInitialLoad={isInitialLoad}
          />
        </div>

        {/* Toggle Button */}
        <div className="p-4 flex justify-end">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 transition-transform duration-200" />
            ) : (
              <ChevronLeft className="h-5 w-5 transition-transform duration-200" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area with left margin */}
      <main 
        className={`flex-1 ${mainMargin} overflow-y-auto relative scrollbar-thin`}
        style={{
          transition: isInitialLoad ? 'none' : 'margin-left 400ms cubic-bezier(0.4, 0.0, 0.2, 1)'
        }}
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