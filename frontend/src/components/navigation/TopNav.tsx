"use client"

import React, { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
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
import { UserAvatar } from "@/components/ui/user-avatar"
import { User, LogOut, Briefcase, Settings, Shield, MessageSquare, Eye, HelpCircle, Share, Info } from "lucide-react"
import { toast } from "sonner"
import { USER_ROLES, ROLE_LABELS } from "@/types/user"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar"
import { FeedbackModal } from "@/components/ui/feedback-modal"
import { AskQuestionModal } from "@/components/faq/AskQuestionModal"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AboutModal } from "@/components/ui/about-modal"

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
  onLogout?: () => void
}

export function TopNav({ user, onLogout }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Determine if share button should be shown (hide on admin, profile, settings pages)
  const hideShareOnPages = ['/admin', '/profile', '/settings'];
  const showShareButton = !hideShareOnPages.some(p => pathname?.startsWith(p));

  // Share handler with Web Share API + clipboard fallback
  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (err) {
        // User cancelled or error - fall through to clipboard
      }
    }
    
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

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
    <nav className="border-b sticky top-0 z-30 bg-white">
      <div className="flex h-16 items-center px-6">
        <div className="ml-auto flex items-center space-x-4">
          {/* Global Search Bar */}
          <GlobalSearchBar />

          {/* Notification Bell */}
          {user && (
            <NotificationBell userId={user.id} />
          )}

          {/* User Menu - always rendered if user exists */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <UserAvatar
                    src={user.profilePicture}
                    seed={user.id || user.email}
                    name={getFullName(user)}
                    size="md"
                  />
                  <span>{getFullName(user)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-3 py-2">
                    {/* User Details Section with increased padding */}
                    <div className="flex items-center gap-3 px-1">
                      <UserAvatar
                        src={user.profilePicture}
                        seed={user.id || user.email}
                        name={getFullName(user)}
                        size="lg"
                      />
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
                <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/my-portfolio")} className="cursor-pointer">
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>My Portfolio</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAskQuestionModalOpen(true)} className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Ask a Question</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Feedback</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setIsFeedbackModalOpen(true)} className="cursor-pointer">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Share Feedback</span>
                    </DropdownMenuItem>
                    {user.role === USER_ROLES.SUPER_USER && (
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/admin?tab=feedback">
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View Feedback</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {user.role === USER_ROLES.SUPER_USER && (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsAboutModalOpen(true)} className="cursor-pointer">
                  <Info className="mr-2 h-4 w-4" />
                  <span>About</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onLogout} 
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Share Button - hidden on admin, profile, and settings pages */}
          {user && showShareButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-9 w-9"
              title="Share this page"
            >
              <Share className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      {/* Ask Question Modal */}
      <AskQuestionModal
        isOpen={isAskQuestionModalOpen}
        onClose={() => setIsAskQuestionModalOpen(false)}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </nav>
  )
}