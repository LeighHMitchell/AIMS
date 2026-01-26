"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationItem } from "@/components/NotificationItem"
import { AtSign, Bell, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiFetch } from '@/lib/api-fetch';

export interface Notification {
  id: string
  type: "mention" | "system"
  title: string
  description: string
  timestamp: string
  isRead: boolean
  activityId?: string
  activityTitle?: string
  link?: string
}

interface NotificationTabsProps {
  userId: string
}

// Convert API notification to component notification
const mapApiNotification = (apiNotif: any): Notification => {
  // Map notification types - faq_question_answered and faq_new_question are system type
  let type: "mention" | "system" = "system"
  if (apiNotif.type === "mention") {
    type = "mention"
  }

  return {
    id: apiNotif.id,
    type,
    title: apiNotif.title,
    description: apiNotif.message,
    timestamp: apiNotif.created_at,
    isRead: apiNotif.is_read,
    activityId: apiNotif.metadata?.activity_id,
    activityTitle: apiNotif.metadata?.activity_title,
    link: apiNotif.link,
  }
}

export function NotificationTabs({ userId }: NotificationTabsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await apiFetch(`/api/notifications/user?userId=${userId}&limit=100`)

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const result = await response.json()
      const mappedNotifications = (result.data || []).map(mapApiNotification)
      setNotifications(mappedNotifications)
    } catch (error: any) {
      console.error('Error fetching notifications:', error)
      setError(error.message || 'Failed to load notifications')
      setNotifications([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    )

    try {
      const response = await apiFetch('/api/notifications/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationIds: [notificationId] }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
      // Revert optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: false } : notif
        )
      )
    }
  }

  const handleMarkAllAsRead = async (type: 'mention' | 'system') => {
    const notificationsToUpdate = notifications
      .filter(n => n.type === type && !n.isRead)
      .map(n => n.id)

    if (notificationsToUpdate.length === 0) return

    // Optimistic update
    setNotifications(prev =>
      prev.map(notif =>
        notificationsToUpdate.includes(notif.id) ? { ...notif, isRead: true } : notif
      )
    )

    try {
      const response = await apiFetch('/api/notifications/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationIds: notificationsToUpdate }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark all as read')
      }

      toast.success(`All ${type} notifications marked as read`)
    } catch (error: any) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark all as read')
      // Revert optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notificationsToUpdate.includes(notif.id) ? { ...notif, isRead: false } : notif
        )
      )
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchNotifications(false)
  }

  const mentionNotifications = notifications.filter(n => n.type === "mention")
  const systemNotifications = notifications.filter(n => n.type === "system")
  const unreadMentions = mentionNotifications.filter(n => !n.isRead).length
  const unreadSystem = systemNotifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !notifications.length) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={handleRefresh}
            className="ml-2"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="mentions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mentions" className="flex items-center gap-2">
            <AtSign className="h-4 w-4" />
            Mentions
            {unreadMentions > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadMentions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            System
            {unreadSystem > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadSystem}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mentions" className="space-y-4">
          {unreadMentions > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAllAsRead('mention')}
              >
                Mark all as read
              </Button>
            </div>
          )}
          
          {mentionNotifications.length > 0 ? (
            mentionNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <AtSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No mentions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                When someone mentions you with @{userId.split('-')[0]}, it will appear here
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {unreadSystem > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAllAsRead('system')}
              >
                Mark all as read
              </Button>
            </div>
          )}
          
          {systemNotifications.length > 0 ? (
            systemNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No system notifications</p>
              <p className="text-sm text-muted-foreground mt-2">
                Important updates about your activities will appear here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 