"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getSortIcon, sortableHeaderClasses } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, Activity, LogIn, LogOut, AlertTriangle, Search, 
  TrendingUp, Clock, UserX, ChevronRight, RefreshCw, Download,
  Building2
} from "lucide-react"
import { formatDistanceToNow, format, subDays } from "date-fns"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"
import { UserActivityPanel } from "./UserActivityPanel"
import { apiFetch } from '@/lib/api-fetch';

interface UserActivityStats {
  userId: string
  userName: string
  userRole: string
  organizationName: string | null
  totalActions: number
  lastActivity: string | null
  loginCount: number
  actionBreakdown: Record<string, number>
}

interface LoginEvent {
  id: string
  userId: string
  action: string
  createdAt: string
  details: any
  user: { name: string; role: string } | null
  ipAddress: string | null
  userAgent: string | null
}

export function UserActivityDashboard() {
  const [stats, setStats] = useState<UserActivityStats[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string>("")
  const [engagementSortField, setEngagementSortField] = useState<'user' | 'organization' | 'actions' | 'logins' | 'lastActivity'>('lastActivity')
  const [engagementSortDir, setEngagementSortDir] = useState<'asc' | 'desc'>('desc')
  const [loginSortField, setLoginSortField] = useState<'user' | 'event' | 'time'>('time')
  const [loginSortDir, setLoginSortDir] = useState<'asc' | 'desc'>('desc')
  const [inactiveSortField, setInactiveSortField] = useState<'user' | 'role' | 'organization' | 'lastActivity' | 'actions'>('lastActivity')
  const [inactiveSortDir, setInactiveSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [summaryRes, loginsRes] = await Promise.all([
        apiFetch('/api/admin/user-activity?type=summary'),
        apiFetch('/api/admin/user-activity?type=logins&limit=100')
      ])
      
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setStats(summaryData)
      }
      
      if (loginsRes.ok) {
        const loginsData = await loginsRes.json()
        setLoginHistory(loginsData)
      }
    } catch (error) {
      console.error('Failed to fetch user activity:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate dashboard metrics
  const totalUsers = stats.length
  const activeToday = stats.filter(s => 
    s.lastActivity && new Date(s.lastActivity) > subDays(new Date(), 1)
  ).length
  const activeThisWeek = stats.filter(s => 
    s.lastActivity && new Date(s.lastActivity) > subDays(new Date(), 7)
  ).length
  const inactiveUsers = stats.filter(s => 
    !s.lastActivity || new Date(s.lastActivity) < subDays(new Date(), 30)
  )
  
  // Count failed logins in the last 24 hours
  const oneDayAgo = subDays(new Date(), 1)
  const failedLogins = loginHistory.filter(l => 
    l.action === 'login_failed' && new Date(l.createdAt) > oneDayAgo
  ).length

  const filteredStats = stats.filter(s =>
    s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.organizationName && s.organizationName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleEngagementSort = (field: typeof engagementSortField) => {
    if (engagementSortField === field) {
      setEngagementSortDir(engagementSortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setEngagementSortField(field)
      setEngagementSortDir('asc')
    }
  }

  const sortedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      const dir = engagementSortDir === 'asc' ? 1 : -1
      switch (engagementSortField) {
        case 'user':
          return dir * a.userName.localeCompare(b.userName)
        case 'organization':
          return dir * (a.organizationName || '').localeCompare(b.organizationName || '')
        case 'actions':
          return dir * (a.totalActions - b.totalActions)
        case 'logins':
          return dir * (a.loginCount - b.loginCount)
        case 'lastActivity': {
          if (!a.lastActivity) return dir
          if (!b.lastActivity) return -dir
          return dir * (new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime())
        }
        default:
          return 0
      }
    })
  }, [filteredStats, engagementSortField, engagementSortDir])

  const handleLoginSort = (field: typeof loginSortField) => {
    if (loginSortField === field) {
      setLoginSortDir(loginSortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setLoginSortField(field)
      setLoginSortDir('asc')
    }
  }

  const sortedLoginHistory = useMemo(() => {
    return [...loginHistory].sort((a, b) => {
      const dir = loginSortDir === 'asc' ? 1 : -1
      switch (loginSortField) {
        case 'user':
          return dir * (a.user?.name || '').localeCompare(b.user?.name || '')
        case 'event':
          return dir * a.action.localeCompare(b.action)
        case 'time':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        default:
          return 0
      }
    })
  }, [loginHistory, loginSortField, loginSortDir])

  const handleInactiveSort = (field: typeof inactiveSortField) => {
    if (inactiveSortField === field) {
      setInactiveSortDir(inactiveSortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setInactiveSortField(field)
      setInactiveSortDir('asc')
    }
  }

  const sortedInactiveUsers = useMemo(() => {
    return [...inactiveUsers].sort((a, b) => {
      const dir = inactiveSortDir === 'asc' ? 1 : -1
      switch (inactiveSortField) {
        case 'user':
          return dir * a.userName.localeCompare(b.userName)
        case 'role':
          return dir * a.userRole.localeCompare(b.userRole)
        case 'organization':
          return dir * (a.organizationName || '').localeCompare(b.organizationName || '')
        case 'lastActivity': {
          if (!a.lastActivity) return dir
          if (!b.lastActivity) return -dir
          return dir * (new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime())
        }
        case 'actions':
          return dir * (a.totalActions - b.totalActions)
        default:
          return 0
      }
    })
  }, [inactiveUsers, inactiveSortField, inactiveSortDir])

  const handleUserClick = (user: UserActivityStats) => {
    setSelectedUserId(user.userId)
    setSelectedUserName(user.userName)
  }

  const exportEngagementData = () => {
    const dataToExport = filteredStats.map(user => ({
      'User': user.userName,
      'Role': getRoleDisplayLabel(user.userRole),
      'Organization': user.organizationName || '-',
      'Total Actions': user.totalActions,
      'Logins': user.loginCount,
      'Last Activity': user.lastActivity 
        ? format(new Date(user.lastActivity), 'yyyy-MM-dd HH:mm:ss') 
        : 'Never',
      'Top Actions': Object.entries(user.actionBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([action, count]) => `${action}: ${count}`)
        .join(', ')
    }))

    const headers = Object.keys(dataToExport[0] || {})
    const csv = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user-engagement-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-body text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{activeToday}</p>
                <p className="text-body text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{activeThisWeek}</p>
                <p className="text-body text-muted-foreground">Active This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserX className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{inactiveUsers.length}</p>
                <p className="text-body text-muted-foreground">Inactive (30+ days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{failedLogins}</p>
                <p className="text-body text-muted-foreground">Failed Logins (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="logins">Login History</TabsTrigger>
            <TabsTrigger value="inactive">Inactive Users</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={exportEngagementData} title="Export CSV" aria-label="Export CSV">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Engagement Tab */}
        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>User Engagement</CardTitle>
                  <CardDescription>Activity summary for all users</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-body text-muted-foreground mb-4">
                Showing {filteredStats.length} of {stats.length} users
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleEngagementSort('user')}>
                        <div className="flex items-center gap-1">User {getSortIcon('user', engagementSortField, engagementSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleEngagementSort('organization')}>
                        <div className="flex items-center gap-1">Organization {getSortIcon('organization', engagementSortField, engagementSortDir)}</div>
                      </TableHead>
                      <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleEngagementSort('actions')}>
                        <div className="flex items-center justify-end gap-1">Actions {getSortIcon('actions', engagementSortField, engagementSortDir)}</div>
                      </TableHead>
                      <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleEngagementSort('logins')}>
                        <div className="flex items-center justify-end gap-1">Logins {getSortIcon('logins', engagementSortField, engagementSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleEngagementSort('lastActivity')}>
                        <div className="flex items-center gap-1">Last Activity {getSortIcon('lastActivity', engagementSortField, engagementSortDir)}</div>
                      </TableHead>
                      <TableHead>Top Actions</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-body text-muted-foreground">No user activity found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedStats.map((user) => (
                        <TableRow key={user.userId} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{user.userName}</span>
                              <Badge variant={getRoleBadgeVariant(user.userRole)} className="w-fit text-helper">
                                {getRoleDisplayLabel(user.userRole)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.organizationName ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-body">{user.organizationName}</span>
                              </div>
                            ) : (
                              <span className="text-body text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{user.totalActions}</TableCell>
                          <TableCell className="text-right">{user.loginCount}</TableCell>
                          <TableCell>
                            {user.lastActivity ? (
                              <span className="text-body text-muted-foreground">
                                {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-body text-orange-500">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {Object.entries(user.actionBreakdown)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 3)
                                .map(([action, count]) => (
                                  <Badge key={action} variant="secondary" className="text-helper">
                                    {action}: {count}
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUserClick(user)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="logins">
          <Card>
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>Recent login and logout events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleLoginSort('user')}>
                        <div className="flex items-center gap-1">User {getSortIcon('user', loginSortField, loginSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleLoginSort('event')}>
                        <div className="flex items-center gap-1">Event {getSortIcon('event', loginSortField, loginSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleLoginSort('time')}>
                        <div className="flex items-center gap-1">Time {getSortIcon('time', loginSortField, loginSortDir)}</div>
                      </TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <LogIn className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-body text-muted-foreground">No login events found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedLoginHistory.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">
                            {event.user?.name || event.details?.user?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                event.action === 'login' ? 'default' : 
                                event.action === 'logout' ? 'secondary' : 
                                'destructive'
                              }
                              className="gap-1"
                            >
                              {event.action === 'login' && <LogIn className="h-3 w-3" />}
                              {event.action === 'logout' && <LogOut className="h-3 w-3" />}
                              {event.action === 'login_failed' && <AlertTriangle className="h-3 w-3" />}
                              {event.action === 'login' ? 'Login' : 
                               event.action === 'logout' ? 'Logout' : 
                               'Failed Login'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-body">
                              {format(new Date(event.createdAt), 'dd MMM yyyy, HH:mm')}
                            </span>
                          </TableCell>
                          <TableCell className="text-body text-muted-foreground">
                            {event.ipAddress || '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inactive Users Tab */}
        <TabsContent value="inactive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-500" />
                Inactive Users
              </CardTitle>
              <CardDescription>Users with no activity in the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {inactiveUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-[hsl(var(--success-icon))] mx-auto mb-2" />
                  <p className="text-muted-foreground">All users have been active recently!</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={sortableHeaderClasses} onClick={() => handleInactiveSort('user')}>
                          <div className="flex items-center gap-1">User {getSortIcon('user', inactiveSortField, inactiveSortDir)}</div>
                        </TableHead>
                        <TableHead className={sortableHeaderClasses} onClick={() => handleInactiveSort('role')}>
                          <div className="flex items-center gap-1">Role {getSortIcon('role', inactiveSortField, inactiveSortDir)}</div>
                        </TableHead>
                        <TableHead className={sortableHeaderClasses} onClick={() => handleInactiveSort('organization')}>
                          <div className="flex items-center gap-1">Organization {getSortIcon('organization', inactiveSortField, inactiveSortDir)}</div>
                        </TableHead>
                        <TableHead className={sortableHeaderClasses} onClick={() => handleInactiveSort('lastActivity')}>
                          <div className="flex items-center gap-1">Last Activity {getSortIcon('lastActivity', inactiveSortField, inactiveSortDir)}</div>
                        </TableHead>
                        <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleInactiveSort('actions')}>
                          <div className="flex items-center justify-end gap-1">Total Actions {getSortIcon('actions', inactiveSortField, inactiveSortDir)}</div>
                        </TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInactiveUsers.map((user) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.userName}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.userRole)} className="text-helper">
                              {getRoleDisplayLabel(user.userRole)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.organizationName || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {user.lastActivity ? (
                              <span className="text-orange-600">
                                {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-destructive">Never logged in</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{user.totalActions}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUserClick(user)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Activity Panel (Drawer) */}
      <UserActivityPanel
        userId={selectedUserId}
        userName={selectedUserName}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  )
}

