"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavLinkProps {
  href: string
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function NavLink({ href, children, icon, className, onClick }: NavLinkProps) {
  const pathname = usePathname()
  
  // Determine if this link is active
  const isActive = React.useMemo(() => {
    if (!pathname) return false
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }, [pathname, href])

  return (
    <Link href={href} onClick={onClick}>
      <Button
        variant={isActive ? "default" : "ghost"}
        className={cn("w-full justify-start", className)}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </Button>
    </Link>
  )
}