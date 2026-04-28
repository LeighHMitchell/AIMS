"use client"

import React, { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { LogOut, LogIn, UserPlus, Briefcase, Settings, Shield, MessageSquare, Eye, HelpCircle, Share, Info, Bell, Bookmark, FolderKanban, BarChart3, MapPin } from "lucide-react"
import { toast } from "sonner"
import { USER_ROLES } from "@/types/user"
import { isVisitorUser } from "@/lib/visitor"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"
import { getCurrentModule } from "@/lib/navigation-utils"
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar"
import { FeedbackModal } from "@/components/ui/feedback-modal"
import { AskQuestionModal } from "@/components/faq/AskQuestionModal"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AboutModal } from "@/components/ui/about-modal"
import { TourButton } from "@/components/tour/TourButton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

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
  const pathname = usePathname();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

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

  const currentMod = getCurrentModule(pathname || '')

  const modules = [
    { label: 'DFMIS', href: '/dashboard', icon: BarChart3, module: 'aims' as const },
    { label: 'Project Bank', href: '/project-bank', icon: FolderKanban, module: 'project-bank' as const },
    { label: 'Land Bank', href: '/land-bank', icon: MapPin, module: 'land-bank' as const },
  ]

  return (
    <nav className="border-b sticky top-0 z-[9999] bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
      <div className="flex h-16 items-center px-6">
        <div className="ml-auto flex items-center space-x-4">
          {/* Global Search Bar */}
          <GlobalSearchBar
            isExpanded={isSearchExpanded}
            onExpandedChange={setIsSearchExpanded}
          />

          {/* Page tour - hidden for visitors */}
          {user && !isVisitorUser(user) && <TourButton />}

          {/* Notification Bell - hidden for visitors */}
          {user && !isVisitorUser(user) && (
            <NotificationBell
              userId={user.id}
              onOpen={() => setIsSearchExpanded(false)}
            />
          )}

          {/* Visitor: Sign In / Create Account buttons */}
          {user && isVisitorUser(user) && (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-body font-medium text-neutral-700 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <button className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-gunmetal hover:bg-gunmetal/90 text-body font-medium text-white transition-colors">
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </button>
              </Link>
            </div>
          )}

          {/* User Menu - only for authenticated (non-visitor) users */}
          {user && !isVisitorUser(user) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 h-10 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <UserAvatar
                    src={user.profilePicture}
                    seed={user.id || user.email}
                    name={getFullName(user)}
                    size="md"
                  />
                  <span className="text-body font-medium text-neutral-700">{getFullName(user)}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px] p-2">
                {/* User Info Header */}
                <div className="px-3 py-3 mb-2">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={user.profilePicture}
                      seed={user.id || user.email}
                      name={getFullName(user)}
                      size="lg"
                    />
                    <div className="flex flex-col space-y-0.5 flex-1 min-w-0">
                      <p className="text-body font-medium leading-tight truncate">{getFullName(user)}</p>
                      <p className="text-helper leading-tight text-neutral-500 truncate">{user.email}</p>
                      <p className="text-helper leading-tight text-neutral-400 truncate">
                        {user.organization?.name || user.organisation || 'No Organization'}
                      </p>
                    </div>
                  </div>
                  {user.role && (
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                      <Badge
                        variant={getRoleBadgeVariant(user.role)}
                        className="w-fit"
                      >
                        {getRoleDisplayLabel(user.role)}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Module Switcher */}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Modules
                </DropdownMenuLabel>
                {modules.map(mod => {
                  const isActive = currentMod === mod.module
                  const ModIcon = mod.icon
                  return (
                    <DropdownMenuItem key={mod.module} asChild className={isActive ? 'bg-neutral-100 font-medium' : ''}>
                      <Link href={mod.href} className="flex items-center gap-2 cursor-pointer">
                        <ModIcon className="h-4 w-4" />
                        <span>{mod.label}</span>
                        {isActive && <span className="ml-auto text-[10px] text-neutral-400">Current</span>}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/dashboard?tab=my-portfolio" className="flex items-center gap-2 cursor-pointer">
                    <Briefcase className="h-4 w-4" />
                    <span>My Portfolio</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/dashboard?tab=notifications" className="flex items-center gap-2 cursor-pointer">
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/dashboard?tab=bookmarks" className="flex items-center gap-2 cursor-pointer">
                    <Bookmark className="h-4 w-4" />
                    <span>Bookmarks</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsAskQuestionModalOpen(true)}>
                  <HelpCircle className="h-4 w-4" />
                  <span>Ask a Question</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsFeedbackModalOpen(true)}>
                  <MessageSquare className="h-4 w-4" />
                  <span>Share Feedback</span>
                </DropdownMenuItem>

                {user.role === USER_ROLES.SUPER_USER && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin?tab=feedback" className="flex items-center gap-2 cursor-pointer">
                      <Eye className="h-4 w-4" />
                      <span>View Feedback</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {user.role === USER_ROLES.SUPER_USER && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsAboutModalOpen(true)}>
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onSelect={onLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Share Button - hidden on admin, profile, settings pages, and for visitors */}
          {user && !isVisitorUser(user) && showShareButton && (
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              title="Share this page"
              aria-label="Share this page"
            >
              <Share className="h-5 w-5" />
            </button>
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
