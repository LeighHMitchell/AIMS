"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Activity,
  Users,
  Building,
  BarChart3,
  Settings,
  UserCheck,
  Search,
  Calendar,
  FileText,
  Map,
  Briefcase,
  Database,
  Shield,
  HelpCircle,
  CalendarClock,
  Wallet,
  ChevronRight,
  Plus,
  FolderPlus,
  Zap,
  Upload,
  ChevronDown,
  Construction
} from "lucide-react"
import {
  HomeIcon,
  MagnifierIcon,
  UnorderedListIcon,
  CurrencyDollarIcon,
  UsersGroupIcon,
  Stack3Icon,
  InfoCircleIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuickAddActivityModal } from "@/components/modals/QuickAddActivityModal"

interface SidebarNavProps {
  userRole?: string
  canManageUsers?: boolean
  canCreateActivities?: boolean
  isInActivityEditor?: boolean
  isLoading?: boolean
  isCollapsed?: boolean
  isInitialLoad?: boolean
}

export function SidebarNav({ 
  userRole, 
  canManageUsers, 
  canCreateActivities,
  isInActivityEditor = false,
  isLoading, 
  isCollapsed = false, 
  isInitialLoad = false 
}: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "EXPLORE": true,
    "FINANCES": true,
    "ACTIVITIES": true,
    "ACTORS": true,
    "OPERATIONS": true,
    "SUPPORT": true,
  })
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  if (isLoading) {
    return (
      <nav className="px-4 py-6">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-10 bg-gray-200 rounded-md animate-pulse ${isCollapsed ? 'w-12' : 'w-full'}`} />
          ))}
        </div>
      </nav>
    )
  }

  const navGroups = [
    {
      label: "EXPLORE",
      icon: MagnifierIcon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Analytics", href: "/analytics-dashboard", show: true },
        { name: "Transparency Index", href: "/transparency-index", show: true, underDevelopment: true },
        { name: "Atlas", href: "/aid-map", show: true },
        { name: "Search", href: "/search", show: true },
        { name: "Aid Effectiveness", href: "/aid-effectiveness-dashboard", show: true, underDevelopment: true },
        { name: "Portfolios", href: "/partners", show: true, underDevelopment: true },
        { name: "Reports", href: "/reports", show: true, underDevelopment: true },
      ]
    },
    {
      label: "ACTIVITIES",
      icon: UnorderedListIcon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Activity List", href: "/activities", show: true },
      ]
    },
    {
      label: "FINANCES",
      icon: CurrencyDollarIcon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Transactions", href: "/transactions", show: true },
        { name: "Planned Disbursements", href: "/planned-disbursements", show: true },
        { name: "Budgets", href: "/budgets", show: true },
      ]
    },
    {
      label: "ACTORS",
      icon: UsersGroupIcon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Organizations", href: "/organizations", show: true },
        { name: "Rolodex", href: "/rolodex", show: true },
      ]
    },
    {
      label: "OPERATIONS",
      icon: Stack3Icon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Calendar", href: "/calendar", show: true, underDevelopment: true },
        { name: "Data Clinic", href: "/data-clinic", show: true, underDevelopment: true },
        { name: "Library", href: "/library", show: true, isNew: true },
        { name: "Build History", href: "/build-history", show: true, isNew: true },
      ]
    },
    {
      label: "SUPPORT",
      icon: InfoCircleIcon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "FAQ", href: "/faq", show: true },
      ]
    },
  ]

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  // Top-level navigation items (outside groups)
  const topLevelItems = [
    { name: "DASHBOARD", href: "/dashboard", icon: HomeIcon, isAnimated: true, show: true },
  ]

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
      <nav className="px-4 py-6">
        <div className="space-y-4">
          {/* Add New Activity CTA Button */}
          {canCreateActivities && (
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className={cn(
                      "w-full justify-center gap-2",
                      isInActivityEditor && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={isInActivityEditor}
                    title={isInActivityEditor ? "Please finish editing the current activity first" : "Create a new activity"}
                  >
                    <Plus className="h-4 w-4" />
                    {!isCollapsed && "Add New Activity"}
                    {!isCollapsed && <ChevronDown className="h-3 w-3 ml-auto" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
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
                      if (isImporting) return;
                      setIsImporting(true);
                      try {
                        const response = await fetch('/api/activities', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: 'Imported Activity (Draft)',
                            description: 'Activity created via IATI/XML import',
                            status: '1',
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

              {/* Quick Add Modal */}
              <QuickAddActivityModal
                isOpen={showQuickAddModal}
                onClose={() => setShowQuickAddModal(false)}
              />
            </div>
          )}

          {/* Top Level Items */}
          <div className="space-y-1">
            {topLevelItems.filter(item => item.show).map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
              const ItemIcon = item.icon

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 py-2 px-3 text-sm font-bold rounded-md",
                    "transition-colors duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  {item.isAnimated ? (
                    <ItemIcon size={20} className="flex-shrink-0" />
                  ) : (
                    <ItemIcon className="h-5 w-5 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      "whitespace-nowrap",
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
                    {item.name}
                  </span>
                </Link>
              )

              return (
                <div key={item.name}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-bold">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </div>
              )
            })}
          </div>

          {/* Grouped Navigation */}
          {navGroups.map((group) => {
            const filteredItems = group.items.filter(item => item.show)
            if (filteredItems.length === 0) return null

            const isOpen = openGroups[group.label]
            const GroupIcon = group.icon

            return (
              <Collapsible
                key={group.label}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.label)}
                className="group/collapsible"
              >
                <div className="space-y-1">
                  {/* Group Label / Trigger */}
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggleGroup(group.label)}
                          className="flex w-full items-center justify-center px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          {group.isAnimated ? (
                            <GroupIcon size={20} className="flex-shrink-0" />
                          ) : (
                            <GroupIcon className="h-5 w-5 flex-shrink-0" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-bold">
                        {group.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          {group.isAnimated ? (
                            <GroupIcon size={20} className="flex-shrink-0" />
                          ) : (
                            <GroupIcon className="h-5 w-5 flex-shrink-0" />
                          )}
                          <span>{group.label}</span>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isOpen && "rotate-90"
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                  )}

                  {/* Group Items with Vertical Connector */}
                  <CollapsibleContent className="space-y-0">
                    <div className="relative">
                      {/* Vertical Connector Line */}
                      {!isCollapsed && isOpen && (
                        <div
                          className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
                          style={{
                            height: '100%',
                          }}
                        />
                      )}

                      {/* Menu Items */}
                      <div className="space-y-0.5">
                        {filteredItems.map((item, index) => {
                          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))

                          const linkContent = (
                            <Link
                              href={item.href}
                              className={cn(
                                "group relative flex items-center py-2 px-3 text-sm font-medium rounded-md",
                                "transition-colors duration-200",
                                "hover:bg-gray-100 dark:hover:bg-gray-800",
                                isActive
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                                // Add left padding for connector when not collapsed
                                !isCollapsed && "ml-4 pl-6"
                              )}
                            >
                              <span
                                className={cn(
                                  "whitespace-nowrap flex items-center gap-2",
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
                                {item.name}
                                {'isNew' in item && item.isNew && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full" style={{ backgroundColor: '#3C6255', color: 'white' }}>
                                    New
                                  </span>
                                )}
                                {'underDevelopment' in item && item.underDevelopment && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Construction className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px] text-center whitespace-normal">
                                      <span className="text-xs">Under Development — This feature is usable but not in its final form</span>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </span>
                            </Link>
                          )

                          return (
                            <div key={item.name}>
                              {isCollapsed ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {linkContent}
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="font-medium">
                                    <div className="flex flex-col gap-1">
                                      <span className="flex items-center gap-2">
                                        {item.name}
                                        {'isNew' in item && item.isNew && (
                                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full" style={{ backgroundColor: '#3C6255', color: 'white' }}>
                                            New
                                          </span>
                                        )}
                                        {'underDevelopment' in item && item.underDevelopment && (
                                          <Construction className="h-3.5 w-3.5 text-gray-400" />
                                        )}
                                      </span>
                                      {'underDevelopment' in item && item.underDevelopment && (
                                        <span className="text-[10px] text-gray-400 font-normal">Under Development — Usable but not final</span>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                linkContent
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      </nav>
    </TooltipProvider>
  )
}