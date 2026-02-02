"use client"

import React, { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu } from "bloom-menu"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { LogOut, Briefcase, Settings, Shield, MessageSquare, Eye, HelpCircle, Share, Info, Bell, Bookmark } from "lucide-react"
import { toast } from "sonner"
import { USER_ROLES } from "@/types/user"
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

const itemClass = "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 cursor-pointer transition-colors"
const dangerItemClass = "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:text-red-600 cursor-pointer transition-colors"

export function TopNav({ user, onLogout }: TopNavProps) {
  const pathname = usePathname();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <nav className="border-b sticky top-0 z-[9999] bg-white">
      <div className="flex h-16 items-center px-6">
        <div className="ml-auto flex items-center space-x-4">
          {/* Global Search Bar */}
          <GlobalSearchBar
            isExpanded={isSearchExpanded}
            onExpandedChange={setIsSearchExpanded}
          />

          {/* Notification Bell */}
          {user && (
            <NotificationBell
              userId={user.id}
              onOpen={() => setIsSearchExpanded(false)}
            />
          )}

          {/* User Menu with Bloom Menu */}
          {user && (
            <Menu.Root
              direction="bottom"
              anchor="end"
              open={isMenuOpen}
              onOpenChange={setIsMenuOpen}
            >
              <Menu.Container
                buttonSize={{ width: 190, height: 40 }}
                menuWidth={280}
                menuRadius={20}
                buttonRadius={9999}
                className="bg-white border border-neutral-200 shadow-none"
              >
                <Menu.Trigger>
                  <div className="flex items-center gap-2 px-2 h-10">
                    <UserAvatar
                      src={user.profilePicture}
                      seed={user.id || user.email}
                      name={getFullName(user)}
                      size="md"
                    />
                    <span className="text-sm font-medium text-neutral-700">{getFullName(user)}</span>
                  </div>
                </Menu.Trigger>
                <Menu.Content className="p-2">
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
                        <p className="text-sm font-medium leading-tight truncate">{getFullName(user)}</p>
                        <p className="text-xs leading-tight text-neutral-500 truncate">{user.email}</p>
                        <p className="text-xs leading-tight text-neutral-400 truncate">
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

                  <div className="border-t border-neutral-100 my-1" />

                  <Link href="/profile" className={itemClass} onClick={() => setIsMenuOpen(false)}>
                    <Settings className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>

                  <Link href="/dashboard?tab=my-portfolio" className={itemClass} onClick={() => setIsMenuOpen(false)}>
                    <Briefcase className="h-4 w-4" />
                    <span>My Portfolio</span>
                  </Link>

                  <Link href="/notifications" className={itemClass} onClick={() => setIsMenuOpen(false)}>
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </Link>

                  <Link href="/dashboard?tab=bookmarks" className={itemClass} onClick={() => setIsMenuOpen(false)}>
                    <Bookmark className="h-4 w-4" />
                    <span>Bookmarks</span>
                  </Link>

                  <Menu.Item className={itemClass} onSelect={() => setIsAskQuestionModalOpen(true)}>
                    <HelpCircle className="h-4 w-4" />
                    <span>Ask a Question</span>
                  </Menu.Item>

                  <div className="border-t border-neutral-100 my-1" />

                  <Menu.Item className={itemClass} onSelect={() => setIsFeedbackModalOpen(true)}>
                    <MessageSquare className="h-4 w-4" />
                    <span>Share Feedback</span>
                  </Menu.Item>

                  {user.role === USER_ROLES.SUPER_USER && (
                    <Link href="/admin?tab=feedback" className={itemClass} onClick={() => setIsMenuOpen(false)}>
                      <Eye className="h-4 w-4" />
                      <span>View Feedback</span>
                    </Link>
                  )}

                  <div className="border-t border-neutral-100 my-1" />

                  {user.role === USER_ROLES.SUPER_USER && (
                    <Link href="/admin" className={itemClass} onClick={() => setIsMenuOpen(false)}>
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  )}

                  <div className="border-t border-neutral-100 my-1" />

                  <Menu.Item className={itemClass} onSelect={() => setIsAboutModalOpen(true)}>
                    <Info className="h-4 w-4" />
                    <span>About</span>
                  </Menu.Item>

                  <div className="border-t border-neutral-100 my-1" />

                  <Menu.Item className={dangerItemClass} onSelect={onLogout}>
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Container>
            </Menu.Root>
          )}

          {/* Share Button - hidden on admin, profile, and settings pages */}
          {user && showShareButton && (
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
