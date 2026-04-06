"use client"

import { useUser } from "@/hooks/useUser"
import { isVisitorUser } from "@/lib/visitor"

/**
 * Wrapper that hides its children when the current user is a visitor.
 * Use this to hide edit/create buttons that aren't already gated by permissions.
 */
export function VisitorHidden({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  if (isVisitorUser(user)) return null
  return <>{children}</>
}
