"use client"

import React from "react"
import { NavLink } from "./NavLink"
import { 
  Home, 
  FileText, 
  Building2, 
  Users, 
  BarChartHorizontal, 
  FileCode, 
  BarChart3, 
  Contact,
  CheckSquare,
  CreditCard,
  PieChart,
  UsersRound,
  Stethoscope
} from "lucide-react"

interface SidebarNavProps {
  userRole?: string
  canManageUsers?: boolean
  isLoading?: boolean
}

// Define nav items with their visibility rules
const getNavItems = (userRole?: string, canManageUsers?: boolean) => [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <Home className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/analytics-dashboard",
    label: "Analytics",
    icon: <BarChart3 className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/iati-import-enhanced",
    label: "IATI Import",
    icon: <FileCode className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/activities",
    label: "Activities",
    icon: <FileText className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: <CreditCard className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/organizations",
    label: "Organizations",
    icon: <Building2 className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/sectors",
    label: "Sectors",
    icon: <PieChart className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/working-groups",
    label: "Working Groups",
    icon: <UsersRound className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/partners",
    label: "Partner Funding Summary",
    icon: <BarChartHorizontal className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/rolodex",
    label: "Rolodex",
    icon: <Contact className="h-4 w-4" strokeWidth={2} />,
    show: true
  },
  {
    href: "/validations",
    label: "Validations",
    icon: <CheckSquare className="h-4 w-4" strokeWidth={2} />,
    show: userRole === 'gov_partner_tier_1' || userRole === 'super_user' || userRole === 'admin'
  },
  {
    href: "/data-clinic",
    label: "Data Clinic",
    icon: <Stethoscope className="h-4 w-4" strokeWidth={2} />,
    show: userRole === 'gov_partner_tier_1' || userRole === 'super_user' || userRole === 'admin'
  },
  {
    href: "/admin/users",
    label: "User Management",
    icon: <Users className="h-4 w-4" strokeWidth={2} />,
    show: canManageUsers === true
  }
]

export function SidebarNav({ userRole, canManageUsers, isLoading }: SidebarNavProps) {
  // Get nav items based on current user permissions
  const navItems = React.useMemo(
    () => getNavItems(userRole, canManageUsers),
    [userRole, canManageUsers]
  )

  // Show all items initially during loading to prevent layout shift
  // Once loaded, apply visibility rules
  const shouldShowItem = (item: any) => {
    if (isLoading) {
      // During loading, show all items that would be visible to any user
      // Hide only admin-specific items
      return item.href !== '/admin/users' && item.href !== '/validations' && item.href !== '/data-clinic';
    }
    return item.show;
  };

  return (
    <nav className="p-4 space-y-2 overflow-y-auto h-full">
      {navItems.map((item) => (
        // Use a stable key and always render the wrapper div
        // This prevents hydration mismatches from conditional rendering
        <div key={item.href} className={shouldShowItem(item) ? undefined : "hidden"}>
          <NavLink href={item.href} icon={item.icon}>
            {item.label}
          </NavLink>
        </div>
      ))}
    </nav>
  )
}