"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Home, Settings, FolderPlus, Users, LogOut, User, FileText, Shield, CheckSquare, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/AuthGuard"
import { useUser } from "@/hooks/useUser"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ROLE_LABELS, USER_ROLES } from "@/types/user"

interface MainLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function MainLayout({ children, requireAuth = true }: MainLayoutProps) {
  const { user, permissions, logout } = useUser();

  const content = (
    <div className="min-h-screen bg-background">
      {/* Persistent Navigation Bar */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="flex h-16 items-center px-4">
          <Link href="/" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
            <Building2 className="h-6 w-6" />
            <span className="text-xl font-bold">AIMS</span>
          </Link>
          <div className="ml-auto flex items-center space-x-4">
            {permissions.canCreateActivities && (
              <Link href="/activities/new" passHref legacyBehavior>
                <Button asChild variant="default" size="sm">
                  <a>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add New Activity
                  </a>
                </Button>
              </Link>
            )}
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{user?.name || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <Badge variant={user?.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"} className="mt-1 w-fit">
                      {user?.role && ROLE_LABELS[user.role]}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                {permissions.canManageUsers && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>User Management</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Site-wide Sidebar */}
        <aside className="w-64 border-r min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-2">
            <Link href="/dashboard" passHref legacyBehavior>
              <Button asChild variant="ghost" className="w-full justify-start">
                <a><Home className="h-4 w-4 mr-2" />Dashboard</a>
              </Button>
            </Link>
            <Link href="/import" passHref legacyBehavior>
              <Button asChild variant="ghost" className="w-full justify-start">
                <a><FileSpreadsheet className="h-4 w-4 mr-2" />Smart Import Tool</a>
              </Button>
            </Link>
            <Link href="/activities" passHref legacyBehavior>
              <Button asChild variant="ghost" className="w-full justify-start">
                <a><FileText className="h-4 w-4 mr-2" />Activities</a>
              </Button>
            </Link>
            <Link href="/partners" passHref legacyBehavior>
              <Button asChild variant="ghost" className="w-full justify-start">
                <a><Building2 className="h-4 w-4 mr-2" />Organizations</a>
              </Button>
            </Link>
            {(user?.role === 'gov_partner_tier_1' || user?.role === 'super_user') && (
              <Link href="/validations" passHref legacyBehavior>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <a><CheckSquare className="h-4 w-4 mr-2" />Validations</a>
                </Button>
              </Link>
            )}
            {permissions.canManageUsers && (
              <Link href="/admin/users" passHref legacyBehavior>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <a><Users className="h-4 w-4 mr-2" />User Management</a>
                </Button>
              </Link>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );

  // Wrap with AuthGuard if authentication is required
  return requireAuth ? <AuthGuard>{content}</AuthGuard> : content;
} 