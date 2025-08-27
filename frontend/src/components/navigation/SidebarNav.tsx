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

interface SidebarNavProps {
  userRole?: string
  canManageUsers?: boolean
  isLoading?: boolean
}

export function SidebarNav({ userRole, canManageUsers, isLoading }: SidebarNavProps) {
  const pathname = usePathname()

  if (isLoading) {
    return (
      <nav className="px-4 py-6">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-md animate-pulse" />
          ))}
        </div>
      </nav>
    )
  }

  const navItems = [
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
      name: "Transactions",
      href: "/transactions",
      icon: FileText,
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
    <nav className="px-4 py-6">
      <div className="space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}