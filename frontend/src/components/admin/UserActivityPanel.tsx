"use client"

import { useState, useEffect } from "react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, Clock, FileText, Edit, Trash2, Plus, 
  CheckCircle, XCircle, Send, UserPlus, DollarSign,
  Building2, LogIn, LogOut, AlertTriangle, RefreshCw,
  Calendar
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"

interface ActivityLog {
  id: string
  actionType: string
  entityType: string
  entityId: string
  activityId?: string
  activityTitle?: string
  user: {
    id: string
    name: string
    role: string
  }
  timestamp: string
  metadata?: any
}

interface UserActivityPanelProps {
  userId: string | null
  userName: string
  isOpen: boolean
  onClose: () => void
}

// Icon mapping for different action types
const getActionIcon = (actionType: string, entityType?: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    create: entityType === 'organization' ? <Building2 className="h-4 w-4 text-green-600" /> : 
            entityType === 'user' ? <UserPlus className="h-4 w-4 text-green-600" /> :
            <Plus className="h-4 w-4 text-green-600" />,
    edit: <Edit className="h-4 w-4 text-blue-600" />,
    delete: <Trash2 className="h-4 w-4 text-red-600" />,
    submit_validation: <Send className="h-4 w-4 text-purple-600" />,
    validate: <CheckCircle className="h-4 w-4 text-green-600" />,
    reject: <XCircle className="h-4 w-4 text-red-600" />,
    publish: <CheckCircle className="h-4 w-4 text-green-600" />,
    unpublish: <XCircle className="h-4 w-4 text-orange-600" />,
    add_contact: <UserPlus className="h-4 w-4 text-blue-600" />,
    remove_contact: <UserPlus className="h-4 w-4 text-red-600" />,
    add_transaction: <DollarSign className="h-4 w-4 text-green-600" />,
    edit_transaction: <DollarSign className="h-4 w-4 text-blue-600" />,
    delete_transaction: <DollarSign className="h-4 w-4 text-red-600" />,
    login: <LogIn className="h-4 w-4 text-green-600" />,
    logout: <LogOut className="h-4 w-4 text-gray-600" />,
    login_failed: <AlertTriangle className="h-4 w-4 text-red-600" />,
    status_change: <RefreshCw className="h-4 w-4 text-purple-600" />,
  }
  return iconMap[actionType] || <Activity className="h-4 w-4 text-gray-600" />
}

// Generate human-readable action descriptions
const getActionDescription = (log: ActivityLog) => {
  const { actionType, entityType, metadata, activityTitle } = log

  // Use metadata.details if available
  if (metadata?.details) {
    return metadata.details
  }

  switch (actionType) {
    case 'create':
      if (entityType === 'organization') return 'Created a new organization'
      if (entityType === 'user') return 'Created a new user'
      return `Created ${entityType}: "${activityTitle || 'Untitled'}"`
    case 'edit':
      if (metadata?.fieldChanged) {
        return `Updated ${metadata.fieldChanged} in "${activityTitle || entityType}"`
      }
      return `Edited ${entityType}: "${activityTitle || 'Untitled'}"`
    case 'delete':
      return `Deleted ${entityType}: "${activityTitle || 'Untitled'}"`
    case 'submit_validation':
      return `Submitted "${activityTitle}" for validation`
    case 'validate':
      return `Approved "${activityTitle}"`
    case 'reject':
      return `Rejected "${activityTitle}"`
    case 'publish':
      return `Published "${activityTitle}"`
    case 'unpublish':
      return `Unpublished "${activityTitle}"`
    case 'login':
      return 'Logged in'
    case 'logout':
      return 'Logged out'
    case 'login_failed':
      return 'Failed login attempt'
    case 'add_transaction':
      return `Added a transaction to "${activityTitle}"`
    case 'edit_transaction':
      return `Edited a transaction in "${activityTitle}"`
    case 'delete_transaction':
      return `Deleted a transaction from "${activityTitle}"`
    case 'status_change':
      const oldVal = metadata?.oldValue || 'unknown'
      const newVal = metadata?.newValue || 'unknown'
      return `Changed status from ${oldVal} to ${newVal}`
    default:
      return `Performed ${actionType} on ${entityType}`
  }
}

export function UserActivityPanel({ userId, userName, isOpen, onClose }: UserActivityPanelProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{
    totalActions: number
    loginCount: number
    lastLogin: string | null
    firstActivity: string | null
  }>({
    totalActions: 0,
    loginCount: 0,
    lastLogin: null,
    firstActivity: null
  })

  useEffect(() => {
    if (userId && isOpen) {
      fetchUserActivity()
    }
  }, [userId, isOpen])

  const fetchUserActivity = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/user-activity?type=logs&userId=${userId}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
        
        // Calculate stats
        const loginLogs = data.filter((log: ActivityLog) => log.actionType === 'login')
        const lastLogin = loginLogs.length > 0 ? loginLogs[0].timestamp : null
        const firstActivity = data.length > 0 ? data[data.length - 1].timestamp : null
        
        setStats({
          totalActions: data.length,
          loginCount: loginLogs.length,
          lastLogin,
          firstActivity
        })
      }
    } catch (error) {
      console.error('Failed to fetch user activity:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = format(new Date(log.timestamp), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {} as Record<string, ActivityLog[]>)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {userName || 'User Activity'}
          </SheetTitle>
          <SheetDescription>
            Complete activity history for this user
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-[400px]" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Activity className="h-4 w-4" />
                  Total Actions
                </div>
                <p className="text-2xl font-bold">{stats.totalActions}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <LogIn className="h-4 w-4" />
                  Login Count
                </div>
                <p className="text-2xl font-bold">{stats.loginCount}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-2 text-sm">
              {stats.lastLogin && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last login: {formatDistanceToNow(new Date(stats.lastLogin), { addSuffix: true })}</span>
                </div>
              )}
              {stats.firstActivity && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>First activity: {format(new Date(stats.firstActivity), 'dd MMM yyyy')}</span>
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Activity Timeline
              </h3>
              
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No activity recorded</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {Object.entries(groupedLogs).map(([date, dayLogs]) => (
                      <div key={date}>
                        <div className="sticky top-0 bg-background py-1">
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(date), 'EEEE, dd MMM yyyy')}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-3">
                          {dayLogs.map((log) => (
                            <div key={log.id} className="flex gap-3 group">
                              <div className="mt-0.5">
                                {getActionIcon(log.actionType, log.entityType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                  {getActionDescription(log)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(log.timestamp), 'HH:mm')}
                                  </span>
                                  {log.entityType && log.entityType !== 'session' && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <Badge variant="secondary" className="text-xs h-5">
                                        {log.entityType}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={fetchUserActivity}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Activity
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

