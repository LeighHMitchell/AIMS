"use client"

import React from "react"
import { 
  LogOut, 
  Settings, 
  Bell, 
  Shield,
  User
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

  // Get user initials for avatar fallback
  const getInitials = () => {
    // Try to use first_name and last_name first
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase()
    }
    // Fall back to constructed name
    const name = userName
    if (name && name !== "User") {
      return name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    // Fall back to email
    if (userEmail && userEmail !== "user@example.com") {
      return userEmail.slice(0, 2).toUpperCase()
    }
    return "CN"
  }

  const handleNavigation = (path: string) => {
    setOpen(false)
    window.location.href = path
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
  }

  // Use email or a default if not available
  const userEmail = user.email || "user@example.com"
  // Construct name from first_name and last_name
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || "User"

  return (
    <div className="p-3 border-t bg-white">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="w-full flex items-center justify-start gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={(user as any).profilePicture} alt={userName} />
            <AvatarFallback className="bg-indigo-600 text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate w-full">
              {userName}
            </span>
            <span className="text-xs text-gray-500 truncate w-full" title={userEmail}>
              {userEmail}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-2 mb-2 bottom-full" 
          align="start"
          sideOffset={8}
        >
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={(user as any).profilePicture} alt={userName} />
              <AvatarFallback className="bg-indigo-600 text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground truncate">
                {userEmail}
              </span>
            </div>
          </div>
          
          <Separator className="my-2" />
          
          <div className="grid gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-9 px-2"
              onClick={() => handleNavigation("/settings")}
            >
              <User className="mr-2 h-4 w-4" />
              My Profile
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start h-9 px-2"
              onClick={() => handleNavigation("/notifications")}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            
            {/* Admin Panel for super users */}
            {user.role === "super_user" && (
              <>
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 px-2"
                  onClick={() => handleNavigation("/admin")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </Button>
              </>
            )}
            
            <Separator className="my-2" />
            
            <Button
              variant="ghost"
              className="w-full justify-start h-9 px-2"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 