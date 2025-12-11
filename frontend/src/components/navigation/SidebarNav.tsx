"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface SidebarNavProps {
  userRole?: string
  canManageUsers?: boolean
  isLoading?: boolean
  isCollapsed?: boolean
  isInitialLoad?: boolean
}

export function SidebarNav({ userRole, canManageUsers, isLoading, isCollapsed = false, isInitialLoad = false }: SidebarNavProps) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Explore": true,
    "Finances": true,
    "Activities": true,
    "Actors": true,
    "Operations": true,
    "Support": true,
  })

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
      label: "Explore",
      icon: Search,
      defaultOpen: true,
      items: [
        { name: "Analytics", href: "/analytics-dashboard", show: true },
        { name: "Transparency Index", href: "/transparency-index", show: true },
        { name: "Atlas", href: "/aid-map", show: true },
        { name: "Network", href: "/aid-flow-map", show: true },
        { name: "Search", href: "/search", show: true },
        { name: "Aid Effectiveness", href: "/aid-effectiveness-dashboard", show: true },
      ]
    },
    {
      label: "Activities",
      icon: Activity,
      defaultOpen: true,
      items: [
        { name: "Activity List", href: "/activities", show: true },
      ]
    },
    {
      label: "Finances",
      icon: Wallet,
      defaultOpen: true,
      items: [
        { name: "Transactions", href: "/transactions", show: true },
        { name: "Planned Disbursements", href: "/planned-disbursements", show: true },
        { name: "Budgets", href: "/budgets", show: true },
      ]
    },
    {
      label: "Actors",
      icon: Users,
      defaultOpen: true,
      items: [
        { name: "Organizations", href: "/organizations", show: true },
        { name: "Partners", href: "/partners", show: true },
        { name: "Rolodex", href: "/rolodex", show: true },
      ]
    },
    {
      label: "Operations",
      icon: Calendar,
      defaultOpen: true,
      items: [
        { name: "Calendar", href: "/calendar", show: true },
        { name: "Data Clinic", href: "/data-clinic", show: true },
      ]
    },
    {
      label: "Support",
      icon: HelpCircle,
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
    { name: "Dashboard", href: "/dashboard", icon: Home, show: true },
  ]

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
      <nav className="px-4 py-6">
        <div className="space-y-4">
          {/* Top Level Items */}
          <div className="space-y-1">
            {topLevelItems.filter(item => item.show).map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
              const ItemIcon = item.icon

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 py-2 px-3 text-sm font-medium rounded-md",
                    "transition-colors duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <ItemIcon className="h-5 w-5 flex-shrink-0" />
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
                      <TooltipContent side="right" className="font-medium">
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
                          className="flex w-full items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <GroupIcon className="h-5 w-5 flex-shrink-0" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {group.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <GroupIcon className="h-5 w-5 flex-shrink-0" />
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
                                  <TooltipContent side="right" className="font-medium">
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