"use client"

import React from "react"
import { 
  LogOut, 
  Settings, 
  Bell, 
  Shield,
  User,
  Contact
} from "lucide-react"
import { useUser } from "@/hooks/useUser"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export function SidebarUserMenu() {
  const { user, logout } = useUser()
  const [open, setOpen] = React.useState(false)

  if (!user) return null

  // Use email or a default if not available
  const userEmail = user.email || "user@example.com"
  // Construct name from first_name and last_name
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || "User"

  return (
    <div className="p-3 border-t bg-white flex items-center gap-2">
      <Contact className="h-10 w-10 text-blue-600" aria-label="Account" />
      <div className="flex flex-col items-start text-left flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate w-full">
          {userName}
        </span>
        <span className="text-xs text-gray-500 truncate w-full" title={userEmail}>
          {userEmail}
        </span>
      </div>
    </div>
  )
} 