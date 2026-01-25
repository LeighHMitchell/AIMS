"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Check, HelpCircle, MessageSquare, ExternalLink, Calendar, ClipboardList, AlertTriangle, CheckCircle2, ArrowRightLeft, Share2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { LoadingText } from '@/components/ui/loading-text';

const ringVariants: Variants = {
  idle: { rotate: 0 },
  ringing: {
    rotate: [0, -15, 15, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
    },
  },
};

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationBellProps {
  userId: string;
  onOpen?: () => void;
}

export function NotificationBell({ userId, onOpen }: NotificationBellProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && onOpen) {
      onOpen();
    }
  };
  const [isRinging, setIsRinging] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [lastMarkAllReadTime, setLastMarkAllReadTime] = useState<number>(0);

  // Trigger ring animation when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadCount && !shouldReduceMotion) {
      setIsRinging(true);
      const timer = setTimeout(() => setIsRinging(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount, shouldReduceMotion]);

  const fetchNotifications = useCallback(async () => {
    const fetchStartTime = Date.now();
    try {
      const response = await fetch(`/api/notifications/user?userId=${userId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        console.log('[NotificationBell] Fetched notifications:', {
          count: data.data?.length || 0,
          unreadCount: data.unreadCount || 0,
          userId
        });

        // If we marked all as read within the last 5 seconds, don't overwrite with stale data
        // This prevents race conditions where a fetch that started before mark-all-read returns after
        if (lastMarkAllReadTime > 0 && fetchStartTime < lastMarkAllReadTime + 5000) {
          console.log('[NotificationBell] Ignoring stale fetch after mark-all-read');
          // Still update notifications list but keep unreadCount at 0
          setNotifications(data.data?.map((n: Notification) => ({ ...n, is_read: true })) || []);
        } else {
          setNotifications(data.data || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[NotificationBell] Error response:', response.status, errorData);
      }
    } catch (error) {
      console.error('[NotificationBell] Error fetching:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, lastMarkAllReadTime]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationIds }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('[NotificationBell] Error marking read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Store previous state for rollback
    const prevUnreadCount = unreadCount;
    const prevNotifications = notifications;

    try {
      // Set timestamp to prevent stale fetches from overwriting our optimistic update
      const markTime = Date.now();
      setLastMarkAllReadTime(markTime);

      // Optimistically update UI immediately
      setUnreadCount(0);
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setOpen(false); // Close the dropdown

      // Then make the API call
      const response = await fetch('/api/notifications/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllRead: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[NotificationBell] Mark all read failed:', response.status, errorData);
        // Rollback optimistic update on error
        setLastMarkAllReadTime(0);
        setUnreadCount(prevUnreadCount);
        setNotifications(prevNotifications);
        return;
      }

      console.log('[NotificationBell] Successfully marked all as read');
      // Don't refetch - optimistic update is now the source of truth
    } catch (error) {
      console.error('[NotificationBell] Error marking all read:', error);
      // Rollback optimistic update on error
      setLastMarkAllReadTime(0);
      setUnreadCount(prevUnreadCount);
      setNotifications(prevNotifications);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead([notification.id]);
    }
    if (notification.link) {
      router.push(notification.link);
      setOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-4 w-4 text-gray-500";
    switch (type) {
      case 'faq_question_answered':
        return <HelpCircle className={iconClass} />;
      case 'faq_new_question':
        return <MessageSquare className={iconClass} />;
      case 'calendar_event_pending':
        return <Calendar className={iconClass} />;
      case 'activity_comment':
        return <MessageSquare className={iconClass} />;
      case 'task_assigned':
        return <ClipboardList className={iconClass} />;
      case 'task_deadline_reminder':
        return <AlertTriangle className={iconClass} />;
      case 'task_completed':
        return <CheckCircle2 className={iconClass} />;
      case 'task_declined':
        return <ClipboardList className={iconClass} />;
      case 'task_reassigned':
        return <ArrowRightLeft className={iconClass} />;
      case 'task_shared':
        return <Share2 className={iconClass} />;
      case 'new_user_registered':
        return <UserPlus className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const displayCount = unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <motion.button
          variants={ringVariants}
          animate={isRinging ? "ringing" : "idle"}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground"
            >
              {displayCount}
            </motion.span>
          )}
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-blue-600 hover:text-blue-800"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">
            <LoadingText>Loading notifications...</LoadingText>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 cursor-pointer',
                  !notification.is_read && 'bg-blue-50'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm break-words',
                      !notification.is_read && 'font-medium'
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 break-words">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {notification.link && (
                    <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-center text-sm text-blue-600 cursor-pointer justify-center"
          onClick={() => {
            router.push('/dashboard?tab=notifications');
            setOpen(false);
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
