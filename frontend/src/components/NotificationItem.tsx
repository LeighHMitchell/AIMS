"use client"

import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Notification } from "@/components/NotificationTabs"
import { CheckCircle, Circle, ExternalLink, AtSign, AlertCircle, CheckCheck, XCircle, Info } from "lucide-react"
import Link from "next/link"

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })

  const getIcon = () => {
    if (notification.type === "mention") {
      return <AtSign className="h-5 w-5 text-blue-500" />
    }
    
    // System notification icons based on content
    if (notification.title.includes("Validated")) {
      return <CheckCheck className="h-5 w-5 text-green-500" />
    }
    if (notification.title.includes("Rejected")) {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    if (notification.title.includes("Requested")) {
      return <Info className="h-5 w-5 text-yellow-500" />
    }
    
    return <AlertCircle className="h-5 w-5 text-gray-500" />
  }

  return (
    <Card className={`transition-all ${notification.isRead ? "opacity-75" : "border-blue-200 bg-blue-50/50"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.description}
                </p>
                {notification.activityId && (
                  <Link
                    href={`/activities/${notification.activityId}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    View Activity
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(notification.id)}
                    className="h-8 px-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-gray-500">{timeAgo}</span>
              {notification.isRead ? (
                <Badge variant="outline" className="text-xs">
                  Read
                </Badge>
              ) : (
                <Badge variant="default" className="text-xs">
                  New
                </Badge>
              )}
              {notification.userName && (
                <span className="text-xs text-gray-500">
                  by {notification.userName}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 