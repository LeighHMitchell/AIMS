"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationItem } from "@/components/NotificationItem"
import { AtSign, Bell, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

export interface Notification {
  id: string
  type: "mention" | "system"
  title: string
  description: string
  timestamp: string
  isRead: boolean
  activityId?: string
  activityTitle?: string
  userId?: string
  userName?: string
}

interface NotificationTabsProps {
  userId: string
}

// Convert database notification to component notification
const mapDbNotification = (dbNotif: any): Notification => ({
  id: dbNotif.id,
  type: dbNotif.type,
  title: dbNotif.title,
  description: dbNotif.description,
  timestamp: dbNotif.created_at,
  isRead: dbNotif.is_read,
  activityId: dbNotif.activity_id,
  activityTitle: dbNotif.activity_title,
  userId: dbNotif.related_user_id,
  userName: dbNotif.related_user_name,
})

// Mock notifications for when Supabase is not available
const getMockNotifications = (userId: string): Notification[] => [
  {
    id: "1",
    type: "mention",
    title: "John Doe mentioned you",
    description: "You were mentioned in a comment on 'Water Supply Project Phase 2'",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isRead: false,
    activityId: "activity-123",
    activityTitle: "Water Supply Project Phase 2",
    userId: "user-1",
    userName: "John Doe"
  },
  {
    id: "2",
    type: "system",
    title: "Activity Validated",
    description: "Your activity 'Rural Education Initiative' has been validated by the government partner",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: false,
    activityId: "activity-456",
    activityTitle: "Rural Education Initiative"
  },
]

export function NotificationTabs({ userId }: NotificationTabsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setIsLoading(true)
    }
    setError(null)

    try {
      if (!supabase) {
        // Use mock data if Supabase is not configured
        setNotifications(getMockNotifications(userId))
        return
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw error
      }

      const mappedNotifications = (data || []).map(mapDbNotification)
      setNotifications(mappedNotifications)
    } catch (error: any) {
      console.error('Error fetching notifications:', error)
      setError(error.message || 'Failed to load notifications')
      // Still show mock data on error
      setNotifications(getMockNotifications(userId))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          const newNotification = mapDbNotification(payload.new)
          setNotifications(prev => [newNotification, ...prev])
          toast.info('New notification received')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          const updatedNotification = mapDbNotification(payload.new)
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    )

    if (!supabase) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) {
        throw error
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

    if (!supabase) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', notificationsToUpdate)

      if (error) {
        throw error
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
          {!supabase && "Showing demo notifications. "}
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