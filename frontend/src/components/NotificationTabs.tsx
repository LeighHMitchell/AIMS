"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { NotificationItem } from "@/components/NotificationItem"
import { AtSign, Bell, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  userName?: string
  archivedAt?: string | null
}

interface NotificationTabsProps {
  userId: string
}

// Convert API notification to component notification
const mapApiNotification = (apiNotif: any): Notification => {
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
    archivedAt: apiNotif.archived_at,
  }
}

function NotificationSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-5 w-5 mt-1 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function NotificationTabs({ userId }: NotificationTabsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Pagination state - separate for each column
  const [mentionsPage, setMentionsPage] = useState(1)
  const [systemPage, setSystemPage] = useState(1)
  const [pageLimit, setPageLimit] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("notifications-page-limit")
      if (saved) {
        const savedLimit = Number(saved)
        if (savedLimit > 0) return savedLimit
      }
    }
    return 10
  })

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
      // Filter out archived notifications
      setNotifications(mappedNotifications.filter((n: Notification) => !n.archivedAt))
      setLastUpdated(new Date())
    } catch (error: any) {
      console.error('Error fetching notifications:', error)
      setError(error.message || 'Failed to load notifications')
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
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
      setNotifications(prev =>
        prev.map(notif =>
          notificationsToUpdate.includes(notif.id) ? { ...notif, isRead: false } : notif
        )
      )
    }
  }

  const handleArchive = async (notificationId: string) => {
    // Optimistic removal
    setNotifications(prev => prev.filter(n => n.id !== notificationId))

    try {
      const response = await apiFetch(`/api/notifications/user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId, action: 'archive' }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive notification')
      }
      toast.success('Notification archived')
    } catch (error: any) {
      console.error('Error archiving notification:', error)
      toast.error('Failed to archive notification')
      // Refetch to restore
      fetchNotifications(false)
    }
  }

  const handleDelete = async (notificationId: string) => {
    // Optimistic removal
    const removedNotif = notifications.find(n => n.id === notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))

    try {
      const response = await apiFetch(`/api/notifications/user`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }
      toast.success('Notification deleted')
    } catch (error: any) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
      // Restore
      if (removedNotif) {
        setNotifications(prev => [...prev, removedNotif].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ))
      }
    }
  }

  const mentionNotifications = notifications.filter(n => n.type === "mention")
  const systemNotifications = notifications.filter(n => n.type === "system")
  const unreadMentions = mentionNotifications.filter(n => !n.isRead).length
  const unreadSystem = systemNotifications.filter(n => !n.isRead).length

  // Pagination for mentions
  const mentionsTotalPages = Math.ceil(mentionNotifications.length / pageLimit)
  const mentionsStartIndex = (mentionsPage - 1) * pageLimit
  const mentionsEndIndex = Math.min(mentionsStartIndex + pageLimit, mentionNotifications.length)
  const paginatedMentions = useMemo(() =>
    mentionNotifications.slice(mentionsStartIndex, mentionsEndIndex),
    [mentionNotifications, mentionsStartIndex, mentionsEndIndex]
  )

  // Pagination for system
  const systemTotalPages = Math.ceil(systemNotifications.length / pageLimit)
  const systemStartIndex = (systemPage - 1) * pageLimit
  const systemEndIndex = Math.min(systemStartIndex + pageLimit, systemNotifications.length)
  const paginatedSystem = useMemo(() =>
    systemNotifications.slice(systemStartIndex, systemEndIndex),
    [systemNotifications, systemStartIndex, systemEndIndex]
  )

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit)
    setMentionsPage(1)
    setSystemPage(1)
    if (typeof window !== 'undefined') {
      localStorage.setItem("notifications-page-limit", newLimit.toString())
    }
  }

  // Mini pagination controls for each column
  const MiniPagination = ({
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
  }: {
    currentPage: number
    setCurrentPage: (page: number) => void
    totalPages: number
    totalItems: number
  }) => {
    if (totalItems <= pageLimit) return null

    return (
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-xs text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            {[...Array(3)].map((_, i) => (
              <NotificationSkeleton key={`mention-${i}`} />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            {[...Array(3)].map((_, i) => (
              <NotificationSkeleton key={`system-${i}`} />
            ))}
          </div>
        </div>
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
            onClick={() => fetchNotifications()}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Last updated:</span> {lastUpdated.toLocaleTimeString()}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Per page:</label>
          <Select
            value={pageLimit.toString()}
            onValueChange={(value) => handlePageLimitChange(Number(value))}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Mentions Column */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                Mentions
                {unreadMentions > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {unreadMentions}
                  </Badge>
                )}
              </CardTitle>
              {unreadMentions > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleMarkAllAsRead('mention')}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {mentionNotifications.length > 0 ? (
              <>
                {paginatedMentions.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
                <MiniPagination
                  currentPage={mentionsPage}
                  setCurrentPage={setMentionsPage}
                  totalPages={mentionsTotalPages}
                  totalItems={mentionNotifications.length}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <AtSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No mentions yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Notifications Column */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                System
                {unreadSystem > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {unreadSystem}
                  </Badge>
                )}
              </CardTitle>
              {unreadSystem > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleMarkAllAsRead('system')}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemNotifications.length > 0 ? (
              <>
                {paginatedSystem.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
                <MiniPagination
                  currentPage={systemPage}
                  setCurrentPage={setSystemPage}
                  totalPages={systemTotalPages}
                  totalItems={systemNotifications.length}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No system notifications</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
