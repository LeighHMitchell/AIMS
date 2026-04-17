"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  TrendingDown,
  Handshake,
  ArrowLeft,
  MapPin,
  ShieldCheck,
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
import { GlassButton } from "@/components/ui/glass-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuickAddActivityModal } from "@/components/modals/QuickAddActivityModal"
import { apiFetch } from '@/lib/api-fetch';
import { getCurrentModule, type AetherModule } from '@/lib/navigation-utils';

interface SidebarNavProps {
  userRole?: string
  canManageUsers?: boolean
  canCreateActivities?: boolean
  canCreateProjects?: boolean
  canCreateParcels?: boolean
  isInActivityEditor?: boolean
  isLoading?: boolean
  isCollapsed?: boolean
  isInitialLoad?: boolean
}

export function SidebarNav({
  userRole,
  canManageUsers,
  canCreateActivities,
  canCreateProjects,
  canCreateParcels,
  isInActivityEditor = false,
  isLoading,
  isCollapsed = false,
  isInitialLoad = false
}: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "EXPLORE": true,
    "PROFILES": true,
    "ADVANCED": true,
    "FINANCES": true,
    "ACTIVITIES": true,
    "ACTORS": true,
    "OPERATIONS": true,
    "SUPPORT": true,
    "PROJECTS": true,
    "REVIEW BOARD": true,
    "SEE TRANSFERS": true,
    "MONITORING": true,
    "LAND BANK": true,
  })
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [sidebarCounts, setSidebarCounts] = useState<Record<string, number>>({})

  const currentModule = getCurrentModule(pathname)

  useEffect(() => {
    // Only fetch sidebar counts for AIMS module
    if (currentModule !== 'aims') return
    let cancelled = false
    async function fetchCounts() {
      try {
        const res = await apiFetch('/api/sidebar-counts')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setSidebarCounts(data)
      } catch {
        // silently fail - counts are cosmetic
      }
    }
    fetchCounts()
    return () => { cancelled = true }
  }, [currentModule])

  // Map href to count key
  const countMap: Record<string, number | undefined> = {
    '/activities': sidebarCounts.activities,
    '/transactions': sidebarCounts.transactions,
    '/planned-disbursements': sidebarCounts.plannedDisbursements,
    '/budgets': sidebarCounts.budgets,
    '/organizations': sidebarCounts.organizations,
    '/rolodex': sidebarCounts.rolodex,
    '/library': sidebarCounts.documents,
    '/faq': sidebarCounts.faqs,
    '/sectors': sidebarCounts.sectors,
    '/policy-markers': sidebarCounts.policyMarkers,
  }

  if (isLoading) {
    return (
      <nav className="px-4 py-6">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-10 bg-muted rounded-md animate-pulse ${isCollapsed ? 'w-12' : 'w-full'}`} />
          ))}
        </div>
      </nav>
    )
  }

  // ─── AIMS sidebar groups (existing) ───
  const aimsNavGroups = [
    {
      label: "EXPLORE",
      icon: MagnifierIcon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Dashboards", href: "/analytics-dashboard", show: true },
        { name: "Plan Alignment", href: "/alignment", show: true },
        { name: "Atlas", href: "/atlas", show: true },
        { name: "Search", href: "/search", show: true },
        { name: "Portfolios", href: "/partners", show: true },
        { name: "Reports", href: "/reports", show: true },
      ]
    },
    {
      label: "ACTIVITIES",
      icon: UnorderedListIcon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Activity List", href: "/activities", show: true },
        { name: "Pooled Funds", href: "/funds", show: true },
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
      label: "PROFILES",
      icon: BarChart3,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "SDGs", href: "/sdgs", show: true },
        { name: "Sectors", href: "/sectors", show: true },
        { name: "Locations", href: "/location-profiles", show: true },
        { name: "Policy Markers", href: "/policy-markers", show: true },
        { name: "Working Groups", href: "/working-groups", show: true },
      ]
    },
    {
      label: "ADVANCED",
      icon: Shield,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Transparency Index", href: "/transparency-index", show: true },
        { name: "Aid Effectiveness", href: "/aid-effectiveness-dashboard", show: true },
      ]
    },
    {
      label: "OPERATIONS",
      icon: Stack3Icon,
      isAnimated: true,
      defaultOpen: true,
      items: [
        { name: "Calendar", href: "/calendar", show: true },
        { name: "Data Clinic", href: "/data-clinic", show: true },
        { name: "Library", href: "/library", show: true },
        { name: "Build History", href: "/build-history", show: true },
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

  // ─── Project Bank sidebar groups ───
  const projectBankNavGroups = [
    {
      label: "PROJECTS",
      icon: FolderKanban,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Project List", href: "/project-bank/projects", show: true },
        { name: "Funding Gaps", href: "/project-bank/gaps", show: true },
      ]
    },
    {
      label: "REVIEW BOARD",
      icon: ShieldCheck,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Phase 1: Intake Reviews", href: "/project-bank/review?tab=intake", show: true },
        { name: "Phase 2: Preliminary Study", href: "/project-bank/review?tab=fs1", show: true },
        { name: "Phase 3: Detailed Study", href: "/project-bank/review?tab=fs2", show: true },
        { name: "Categorized", href: "/project-bank/review?tab=categorized", show: true },
        { name: "Rejected", href: "/project-bank/review?tab=rejected", show: true },
      ]
    },
    {
      label: "MONITORING",
      icon: CalendarClock,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Monitoring Dashboard", href: "/project-bank/monitoring", show: true },
      ]
    },
    {
      label: "SEE TRANSFERS",
      icon: TrendingDown,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "All Transfers", href: "/project-bank/transfers", show: true },
      ]
    },
    {
      label: "SUPPORT",
      icon: HelpCircle,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Build History", href: "/build-history", show: true },
        { name: "FAQ", href: "/faq", show: true },
      ]
    },
  ]

  // ─── Land Bank sidebar groups ───
  const landBankNavGroups = [
    {
      label: "LAND BANK",
      icon: MapPin,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Dashboard", href: "/land-bank", show: true },
        { name: "All Parcels", href: "/land-bank/parcels", show: true },

        { name: "Import Parcels", href: "/land-bank/import", show: canCreateParcels },
        { name: "Analytics", href: "/land-bank/analytics", show: true },
      ]
    },
    {
      label: "SUPPORT",
      icon: HelpCircle,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Build History", href: "/build-history", show: true },
        { name: "FAQ", href: "/faq", show: true },
      ]
    },
  ]

  // ─── Home sidebar groups (module chooser page) ───
  const homeNavGroups = [
    {
      label: "SUPPORT",
      icon: HelpCircle,
      isAnimated: false,
      defaultOpen: true,
      items: [
        { name: "Build History", href: "/build-history", show: true },
        { name: "FAQ", href: "/faq", show: true },
      ]
    },
  ]

  // Choose which nav groups to show based on current module
  const navGroups = currentModule === 'project-bank'
    ? projectBankNavGroups
    : currentModule === 'land-bank'
    ? landBankNavGroups
    : currentModule === 'home'
    ? homeNavGroups
    : aimsNavGroups

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  // Top-level navigation items
  const topLevelItems = currentModule === 'project-bank'
    ? [{ name: "DASHBOARD", href: "/project-bank", icon: HomeIcon, isAnimated: true, show: true }]
    : currentModule === 'land-bank'
    ? [{ name: "DASHBOARD", href: "/land-bank", icon: HomeIcon, isAnimated: true, show: true }]
    : currentModule === 'aims'
    ? [{ name: "WORKSPACE", href: "/dashboard", icon: Briefcase, isAnimated: true, show: true }]
    : []

  // Show "Back to Home" link when inside a module
  const showBackToHome = currentModule === 'project-bank' || currentModule === 'aims' || currentModule === 'land-bank'

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
      <nav className="px-4 py-6">
        <div className="space-y-4">
          {/* Back to Home link */}
          {showBackToHome && (
            <div className="pb-2">
              <Link
                href="/home"
                className="group flex items-center gap-2 py-1.5 px-3 ml-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className={cn(
                  "whitespace-nowrap",
                  isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                )}>
                  Back to Home
                </span>
              </Link>
            </div>
          )}

          {/* Module CTA Button */}
          {currentModule === 'aims' && canCreateActivities && (
            <div className="pb-4 border-b border-border dark:border-gray-700" data-tour="activities-create">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={isInActivityEditor ? 0 : undefined}>
                      <DropdownMenuTrigger asChild>
                        <GlassButton
                          className={cn(
                            "w-full justify-center gap-2 bg-gray-900 hover:bg-gray-800",
                            isInActivityEditor && "opacity-50 cursor-not-allowed pointer-events-none"
                          )}
                          disabled={isInActivityEditor}
                        >
                          <Plus className="h-4 w-4" />
                          {!isCollapsed && "Add New Activity"}
                          {!isCollapsed && <ChevronDown className="h-3 w-3 ml-auto" />}
                        </GlassButton>
                      </DropdownMenuTrigger>
                    </span>
                  </TooltipTrigger>
                  {isInActivityEditor && (
                    <TooltipContent side="right">
                      <p>Please finish editing the current activity before creating a new one</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Create Activity</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/activities/new" className="flex items-center cursor-pointer">
                      <FolderPlus className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">Full Activity Editor</span>
                        <span className="text-xs text-muted-foreground">Complete data entry</span>
                      </div>
                    </Link>
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
                        const response = await apiFetch('/api/activities', {
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
                      <span className="font-medium">Import Single Activity</span>
                      <span className="text-xs text-muted-foreground">From IATI search, file, URL, or paste</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/iati-import" className="flex items-center cursor-pointer">
                      <Database className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">Bulk IATI Import</span>
                        <span className="text-xs text-muted-foreground">Import multiple activities at once</span>
                      </div>
                    </Link>
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

          {currentModule === 'project-bank' && canCreateProjects && (
            <div className="pb-4 border-b border-border dark:border-gray-700">
              <GlassButton
                asChild
                className="w-full justify-center gap-2 bg-gray-900 hover:bg-gray-800"
              >
                <Link href="/project-bank/new">
                  <Plus className="h-4 w-4" />
                  {!isCollapsed && "Submit Project"}
                </Link>
              </GlassButton>
            </div>
          )}

          {currentModule === 'land-bank' && canCreateParcels && (
            <div className="pb-4 border-b border-border dark:border-gray-700">
              <GlassButton
                asChild
                className="w-full justify-center gap-2 bg-gray-900 hover:bg-gray-800"
              >
                <Link href="/land-bank/new">
                  <Plus className="h-4 w-4" />
                  {!isCollapsed && "Register Parcel"}
                </Link>
              </GlassButton>
            </div>
          )}

          {/* Top Level Items */}
          {topLevelItems.length > 0 && (
            <div className="space-y-1">
              {topLevelItems.filter(item => item.show).map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href) && pathname === item.href)
                const ItemIcon = item.icon

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 py-2 px-3 ml-2 text-sm font-bold rounded-md",
                      "transition-colors duration-200",
                      "hover:bg-[#5f7f7a]/8 dark:hover:bg-[#5f7f7a]/15",
                      isActive
                        ? "bg-[#5f7f7a]/15 text-[#3C6255] dark:bg-[#5f7f7a]/20 dark:text-[#7a9994]"
                        : "text-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100"
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
          )}

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
                          className="flex w-full items-center justify-center px-3 py-2 text-sm font-bold text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-gray-200 transition-colors rounded-md hover:bg-muted dark:hover:bg-gray-800/50"
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
                      <button className="flex w-full items-center justify-between px-3 py-2 text-sm font-bold text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-gray-200 transition-colors rounded-md hover:bg-muted dark:hover:bg-gray-800/50">
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
                          className="absolute left-[18px] top-0 bottom-0 w-px bg-muted dark:bg-gray-700"
                          style={{
                            height: '100%',
                          }}
                        />
                      )}

                      {/* Menu Items */}
                      <div className="space-y-0.5">
                        {filteredItems.map((item, index) => {
                          // For top-level module routes (e.g. /project-bank, /dashboard), only match exact path
                          // to prevent the "Dashboard" sub-item from highlighting on child routes
                          const isExactOnly = topLevelItems.some(t => t.href === item.href)
                          // Handle items with query params (e.g. /project-bank/review?tab=intake)
                          const isActive = (() => {
                            if (item.href.includes('?')) {
                              const [itemPath, itemQuery] = item.href.split('?')
                              if (pathname !== itemPath) return false
                              const itemParams = new URLSearchParams(itemQuery)
                              const entries = Array.from(itemParams.entries())
                              // Default: if no query param in URL, match the first item (default tab)
                              if (entries.length > 0 && !searchParams.get(entries[0][0])) {
                                return entries[0][1] === 'intake' // default tab
                              }
                              return entries.every(([k, v]) => searchParams.get(k) === v)
                            }
                            return isExactOnly
                              ? pathname === item.href
                              : pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href + '/'))
                          })()

                          const itemCount = countMap[item.href]

                          const linkContent = (
                            <Link
                              href={item.href}
                              className={cn(
                                "group relative flex items-center justify-between py-2 px-3 text-sm font-medium rounded-md",
                                "transition-colors duration-200",
                                "hover:bg-[#5f7f7a]/8 dark:hover:bg-[#5f7f7a]/15",
                                isActive
                                  ? "bg-[#5f7f7a]/15 text-[#3C6255] dark:bg-[#5f7f7a]/20 dark:text-[#7a9994]"
                                  : "text-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100",
                                // Add left padding for connector when not collapsed
                                !isCollapsed && "ml-6 pl-6"
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
                              </span>
                              {!isCollapsed && itemCount != null && itemCount > 0 && (
                                <span className="text-[11px] tabular-nums text-muted-foreground dark:text-muted-foreground font-normal ml-auto">
                                  {itemCount.toLocaleString()}
                                </span>
                              )}
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
                                      </span>
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
