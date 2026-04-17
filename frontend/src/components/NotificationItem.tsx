"use client"

import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Notification } from "@/components/NotificationTabs"
import { CheckCircle, ExternalLink, AtSign, AlertCircle, CheckCheck, XCircle, Info, Archive, ArchiveRestore, Trash2 } from "lucide-react"
import Link from "next/link"

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
  onDelete?: (id: string) => void
}

// Parse pipe-separated key:value format into structured data
function parseDescription(description: string): { isKeyValue: boolean; items: { key: string; value: string }[] } {
  if (!description.includes(' | ') || !description.includes(': ')) {
    return { isKeyValue: false, items: [] }
  }

  const parts = description.split(' | ')
  const items: { key: string; value: string }[] = []

  for (const part of parts) {
    const colonIndex = part.indexOf(': ')
    if (colonIndex > 0) {
      items.push({
        key: part.substring(0, colonIndex).trim(),
        value: part.substring(colonIndex + 2).trim()
      })
    }
  }

  return { isKeyValue: items.length >= 2, items }
}

export function NotificationItem({ notification, onMarkAsRead, onArchive, onUnarchive, onDelete }: NotificationItemProps) {
  const isArchived = !!notification.archivedAt
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })

  const getIcon = () => {
    if (notification.type === "mention") {
      return <AtSign className="h-5 w-5 text-blue-500" />
    }

    if (notification.title.includes("Validated")) {
      return <CheckCheck className="h-5 w-5 text-[hsl(var(--success-icon))]" />
    }
    if (notification.title.includes("Rejected")) {
      return <XCircle className="h-5 w-5 text-destructive" />
    }
    if (notification.title.includes("Requested")) {
      return <Info className="h-5 w-5 text-yellow-500" />
    }

    return <AlertCircle className="h-5 w-5 text-muted-foreground" />
  }

  return (
    <Card className={`transition-all ${isArchived ? "opacity-50 bg-muted/30" : notification.isRead ? "opacity-75" : "border-border bg-muted/40"}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-medium text-foreground text-sm mb-1">
                  {notification.title}
                </h4>
                {(() => {
                  const parsed = parseDescription(notification.description)
                  if (parsed.isKeyValue) {
                    return (
                      <div className="text-sm text-muted-foreground mb-2 space-y-0.5">
                        {parsed.items.map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-muted-foreground font-medium min-w-[100px] text-xs">{item.key}:</span>
                            <span className="text-foreground text-xs">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return (
                    <p className="text-xs text-muted-foreground mb-2">
                      {notification.description}
                    </p>
                  )
                })()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                    className="h-7 w-7 p-0"
                    title="Mark as read"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isArchived && onUnarchive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onUnarchive(notification.id); }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Unarchive"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  </Button>
                ) : !isArchived && onArchive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onArchive(notification.id); }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Archive"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Footer: View link + meta */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {notification.activityId && (
                  <Link
                    href={`/activities/${notification.activityId}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View Activity
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                {!notification.activityId && notification.link && (
                  <Link
                    href={notification.link}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {notification.link.includes('/tasks') ? 'View Task' :
                     notification.link.includes('/admin') ? 'View in Admin' :
                     'View Details'}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                {notification.isRead ? (
                  <Badge variant="outline" className="text-xs h-5">
                    Read
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs h-5">
                    New
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
