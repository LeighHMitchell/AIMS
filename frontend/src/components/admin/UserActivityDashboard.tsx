"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  ).sort((a, b) => {
    // Sort by last activity (most recent first), nulls last
    if (!a.lastActivity) return 1
    if (!b.lastActivity) return -1
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  })

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
                <p className="text-sm text-muted-foreground">Total Users</p>
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
                <p className="text-sm text-muted-foreground">Active Today</p>
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
                <p className="text-sm text-muted-foreground">Active This Week</p>
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
                <p className="text-sm text-muted-foreground">Inactive (30+ days)</p>
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
                <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
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
            <Button variant="outline" size="sm" onClick={exportEngagementData}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
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
              <div className="text-sm text-muted-foreground mb-4">
                Showing {filteredStats.length} of {stats.length} users
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                      <TableHead className="text-right">Logins</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Top Actions</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No user activity found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStats.map((user) => (
                        <TableRow key={user.userId} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{user.userName}</span>
                              <Badge variant={getRoleBadgeVariant(user.userRole)} className="w-fit text-xs">
                                {getRoleDisplayLabel(user.userRole)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.organizationName ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{user.organizationName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{user.totalActions}</TableCell>
                          <TableCell className="text-right">{user.loginCount}</TableCell>
                          <TableCell>
                            {user.lastActivity ? (
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-sm text-orange-500">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {Object.entries(user.actionBreakdown)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 3)
                                .map(([action, count]) => (
                                  <Badge key={action} variant="secondary" className="text-xs">
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
                      <TableHead>User</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <LogIn className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No login events found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginHistory.map((event) => (
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
                            <span className="text-sm">
                              {format(new Date(event.createdAt), 'dd MMM yyyy, HH:mm')}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
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
                  <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">All users have been active recently!</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Total Actions</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inactiveUsers.map((user) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.userName}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.userRole)} className="text-xs">
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
                              <span className="text-red-500">Never logged in</span>
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

