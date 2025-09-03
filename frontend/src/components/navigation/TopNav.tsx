"use client"

import React, { useState } from "react"
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
import { FolderPlus, User, LogOut, Briefcase, Settings, Shield, MessageSquare } from "lucide-react"
import { USER_ROLES, ROLE_LABELS } from "@/types/user"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar"
import { FeedbackModal } from "@/components/ui/feedback-modal"

interface TopNavProps {
  user?: {
    id: string
    name: string
    email: string
    role: string
    profilePicture?: string
    firstName?: string
    lastName?: string
    title?: string
    middleName?: string
    suffix?: string
    organisation?: string
    organization?: {
      id: string
      name: string
      acronym?: string
    }
  } | null
  canCreateActivities?: boolean
  onLogout?: () => void
}

export function TopNav({ user, canCreateActivities, onLogout }: TopNavProps) {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Function to construct full name - only FirstName LastName
  const getFullName = (user: TopNavProps['user']) => {
    if (!user) return "User";
    
    const parts = [];
    if (user.firstName) parts.push(user.firstName);
    if (user.lastName) parts.push(user.lastName);
    
    const fullName = parts.join(' ');
    
    return fullName || user.name || "User";
  };

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
                  <span>{getFullName(user)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-3 py-2">
                    {/* User Details Section with increased padding */}
                    <div className="flex items-center gap-3 px-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profilePicture} key={user.profilePicture} />
                        <AvatarFallback>
                          {user.firstName?.[0] || user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          {user.lastName?.[0] || (user.name?.split(' ')[1]?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1 flex-1">
                        <p className="text-sm font-medium leading-tight">{getFullName(user)}</p>
                        <p className="text-xs leading-tight text-muted-foreground">{user.email}</p>
                        {/* Organization Context - Always show */}
                        <p className="text-xs leading-tight text-muted-foreground font-light">
                          {user.organization?.name || user.organisation || 'No Organization'}
                          {user.organization?.acronym ? ` (${user.organization.acronym})` : ''}
                        </p>
                      </div>
                    </div>
                    
                    {/* Visual Separator and Role Badge Section */}
                    {user.role && (
                      <>
                        <div className="border-t border-gray-200 mx-1"></div>
                        <div className="px-1">
                          <Badge 
                            variant={getRoleBadgeVariant(user.role)} 
                            className="w-fit"
                          >
                            {getRoleDisplayLabel(user.role)}
                          </Badge>
                        </div>
                        <div className="border-t border-gray-200 mx-1"></div>
                      </>
                    )}
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
                <DropdownMenuItem onClick={() => setIsFeedbackModalOpen(true)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Feedback</span>
                </DropdownMenuItem>
                {user.role === USER_ROLES.SUPER_USER && (
                  <Link href="/admin">
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin</span>
                    </DropdownMenuItem>
                  </Link>
                )}
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
      
      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)} 
      />
    </nav>
  )
}