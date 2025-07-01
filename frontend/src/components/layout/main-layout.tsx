"use client"

import React from "react"
import { Building2 } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/AuthGuard"
import { useUser } from "@/hooks/useUser"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { SidebarNav } from "@/components/navigation/SidebarNav"
import { SidebarUserMenu } from "@/components/navigation/SidebarUserMenu"
import { TopNav } from "@/components/navigation/TopNav"

interface MainLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function MainLayout({ children, requireAuth = true }: MainLayoutProps) {
  const { user, permissions, logout } = useUser();

  // Debug log
  console.log('[MainLayout] Rendering with user:', user);
  console.log('[MainLayout] User authenticated:', !!user);

  const content = (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Fixed Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-gray-100 border-r h-full fixed z-40 flex flex-col">
        {/* Logo Section */}
        <div className="h-16 border-b bg-white flex items-center px-4 flex-shrink-0">
          <Link href="/" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
            <Building2 className="h-6 w-6" />
            <span className="text-xl font-bold">AIMS</span>
          </Link>
        </div>
        
        {/* Hydration-safe Navigation - flex-1 to take remaining space */}
        <div className="flex-1 overflow-hidden">
          <SidebarNav 
            userRole={user?.role} 
            canManageUsers={permissions.canManageUsers} 
          />
        </div>

        {/* User Menu - pinned to bottom */}
        <SidebarUserMenu />
      </aside>

      {/* Main Content Area with left margin */}
      <main className="flex-1 ml-72 overflow-y-auto">
        {/* Hydration-safe Top Navigation */}
        <TopNav 
          user={user}
          canCreateActivities={permissions.canCreateActivities}
          onLogout={logout}
        />

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );

  // Wrap with AuthGuard if authentication is required
  const wrappedContent = <ErrorBoundary>{content}</ErrorBoundary>;
  return requireAuth ? <AuthGuard>{wrappedContent}</AuthGuard> : wrappedContent;
} 