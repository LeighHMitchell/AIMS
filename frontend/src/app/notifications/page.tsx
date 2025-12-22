"use client"

import { useState } from "react"
import { useUser } from "@/hooks/useUser"
import { MainLayout } from "@/components/layout/main-layout"
import { NotificationTabs } from "@/components/NotificationTabs"
import { LoadingText } from "@/components/ui/loading-text"
import { Bell } from "lucide-react"

export default function NotificationsPage() {
  const { user, isLoading } = useUser()
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingText>Loading notifications...</LoadingText>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Please log in to view notifications</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground mt-1">Stay updated with mentions and system alerts</p>
            </div>
          </div>
        </div>

        <NotificationTabs userId={user.id} />
      </div>
    </MainLayout>
  )
} 