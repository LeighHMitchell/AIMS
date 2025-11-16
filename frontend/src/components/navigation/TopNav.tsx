"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FolderPlus, User, LogOut, Briefcase, Settings, Shield, MessageSquare, ChevronDown, Zap, Eye, Upload } from "lucide-react"
import { USER_ROLES, ROLE_LABELS } from "@/types/user"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar"
import { FeedbackModal } from "@/components/ui/feedback-modal"
import { QuickAddActivityModal } from "@/components/modals/QuickAddActivityModal"
import { ImportActivityModal } from "@/components/modals/ImportActivityModal"

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
  isInActivityEditor?: boolean
  onLogout?: () => void
}

export function TopNav({ user, canCreateActivities, isInActivityEditor = false, onLogout }: TopNavProps) {
  const router = useRouter();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
          
          {/* Add New Activity Dropdown - conditionally rendered but with stable structure */}
          <div className={canCreateActivities ? undefined : "hidden"}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isInActivityEditor}
                  className={isInActivityEditor ? "opacity-50 cursor-not-allowed" : ""}
                  title={isInActivityEditor ? "Please finish editing the current activity first" : "Create a new activity"}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add New Activity
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Create Activity</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/activities/new")}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Full Activity Editor</span>
                    <span className="text-xs text-muted-foreground">Complete data entry</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowQuickAddModal(true)}>
                  <Zap className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Quick Add</span>
                    <span className="text-xs text-muted-foreground">Minimal activity creation</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (!user?.id || isImporting) return;
                    setIsImporting(true);
                    try {
                      const response = await fetch('/api/activities', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: 'Imported Activity (Draft)',
                          description: 'Activity created via IATI/XML import',
                          status: '1',
                          user_id: user.id,
                          created_via: 'import',
                        }),
                      });
                      if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Failed to create draft activity');
                      }
                      const newActivity = await response.json();
                      router.push(`/activities/new?id=${newActivity.id}&tab=xml-import`);
                    } catch (e) {
                      console.error('Failed to start import', e);
                    } finally {
                      setIsImporting(false);
                    }
                  }}
                  disabled={isImporting}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Import from IATI/XML</span>
                    <span className="text-xs text-muted-foreground">Import via Search, File, URL, or Paste</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/my-portfolio")}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>My Portfolio</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Feedback</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setIsFeedbackModalOpen(true)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Share Feedback</span>
                    </DropdownMenuItem>
                    {user.role === USER_ROLES.SUPER_USER && (
                      <DropdownMenuItem onClick={() => router.push('/admin?tab=feedback')}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>View Feedback</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {user.role === USER_ROLES.SUPER_USER && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                  </DropdownMenuItem>
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
      
      {/* Quick Add Activity Modal */}
      <QuickAddActivityModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        user={user}
      />

      {/* Import Activity Modal (unused: direct navigation implemented) */}
    </nav>
  )
}