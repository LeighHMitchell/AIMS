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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FolderPlus, User, LogOut, Briefcase, Settings } from "lucide-react"
import { USER_ROLES, ROLE_LABELS } from "@/types/user"
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar"

interface TopNavProps {
  user?: {
    id: string
    name: string
    email: string
    role: string
    profilePicture?: string
    firstName?: string
    lastName?: string
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
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profilePicture} key={user.profilePicture} />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      {user.lastName?.[0] || (user.name?.split(' ')[1]?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.name || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profilePicture} key={user.profilePicture} />
                        <AvatarFallback>
                          {user.firstName?.[0] || user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          {user.lastName?.[0] || (user.name?.split(' ')[1]?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={user.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"} 
                      className="mt-1 w-fit"
                    >
                      {user.role && ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/my-portfolio">
                  <DropdownMenuItem>
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>My Portfolio</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
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