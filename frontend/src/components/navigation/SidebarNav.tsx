"use client"

import React from "react"
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
  HelpCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarNavProps {
  userRole?: string
  canManageUsers?: boolean
  isLoading?: boolean
  isCollapsed?: boolean
  isInitialLoad?: boolean
}

export function SidebarNav({ userRole, canManageUsers, isLoading, isCollapsed = false, isInitialLoad = false }: SidebarNavProps) {
  const pathname = usePathname()

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

  const navItems = [
    {
      name: "Aid Map",
      href: "/aid-map",
      icon: Map,
      show: true
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      show: true
    },
    {
      name: "Activities",
      href: "/activities",
      icon: Activity,
      show: true
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: FileText,
      show: true
    },
    {
      name: "Organizations",
      href: "/organizations",
      icon: Building,
      show: true
    },
    {
      name: "Partners",
      href: "/partners",
      icon: Users,
      show: true
    },
    {
      name: "Analytics",
      href: "/analytics-dashboard",
      icon: BarChart3,
      show: true
    },
    {
      name: "Aid Effectiveness",
      href: "/aid-effectiveness-dashboard",
      icon: Shield,
      show: true
    },
    {
      name: "Search",
      href: "/search",
      icon: Search,
      show: true
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: Calendar,
      show: true
    },
    {
      name: "Aid Flow Map",
      href: "/aid-flow-map",
      icon: Map,
      show: true
    },

    {
      name: "Rolodex",
      href: "/rolodex",
      icon: UserCheck,
      show: true
    },
    {
      name: "Data Clinic",
      href: "/data-clinic",
      icon: Database,
      show: true
    },
    {
      name: "FAQ",
      href: "/faq",
      icon: HelpCircle,
      show: true
    },

  ]

  const filteredNavItems = navItems.filter(item => item.show)

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
      <nav className="px-4 py-6">
        <div className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            const Icon = item.icon
            
            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center py-2 px-3 text-sm font-medium rounded-md",
                  "transition-colors duration-200",
                  "hover:bg-gray-100",
                  isActive
                    ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600 shadow-sm"
                    : "text-gray-700 hover:text-gray-900"
                )}
              >
                <Icon 
                  className={cn(
                    "flex-shrink-0 h-5 w-5",
                    isActive && "scale-110 transition-transform duration-200"
                  )}
                  style={{
                    marginRight: isCollapsed ? '0' : '0.75rem',
                    transition: isInitialLoad ? 'none' : 'margin-right 400ms cubic-bezier(0.4, 0.0, 0.2, 1)'
                  }}
                />
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
      </nav>
    </TooltipProvider>
  )
}