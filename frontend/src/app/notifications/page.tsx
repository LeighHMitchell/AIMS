"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { NotificationTabs } from "@/components/NotificationTabs"
import { useUser } from "@/hooks/useUser"
import { Bell } from "lucide-react"

export default function NotificationsPage() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-screen-xl mx-auto px-6 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-screen-xl mx-auto px-6 py-6">
          <p className="text-muted-foreground">Please sign in to view notifications.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-semibold text-slate-800">Notifications</h1>
        </div>
        <NotificationTabs userId={user.id} />
      </div>
    </MainLayout>
  )
}
