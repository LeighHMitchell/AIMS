"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { FolderPlus, User, LogOut } from "lucide-react"
import { USER_ROLES, ROLE_LABELS } from "@/types/user"
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar"

interface TopNavProps {
  user?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  canCreateActivities?: boolean
  onLogout?: () => void
}

export function TopNav({ user, canCreateActivities, onLogout }: TopNavProps) {
  return (
    <nav className="border-b bg-white sticky top-0 z-30">
      <div className="flex h-16 items-center px-6">
        <div className="ml-auto flex items-center space-x-4">
          {/* Global Search Bar */}
          <GlobalSearchBar className="w-[500px]" />
          
          {/* Add New Activity Button - conditionally rendered but with stable structure */}
          <div className={canCreateActivities ? undefined : "hidden"}>
            <Link href="/activities/new">
              <Button variant="default" size="sm">
                <FolderPlus className="h-4 w-4 mr-2" />
                Add New Activity
              </Button>
            </Link>
          </div>
          
          {/* User Menu - always rendered if user exists */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{user.name || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <Badge 
                      variant={user.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"} 
                      className="mt-1 w-fit"
                    >
                      {user.role && ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  )
}