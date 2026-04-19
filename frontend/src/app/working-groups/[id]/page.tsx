"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  FileText,
  Calendar,
  Plus,
  Mail,
  Building,
  UserPlus,
  Trash2,
  Download,
  Clock,
  MapPin,
  GitBranch,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api-fetch'
import { Breadcrumbs } from "@/components/ui/breadcrumbs"

interface WorkingGroupMember {
  id: string
  person_name: string
  person_email?: string
  person_organization?: string
  job_title?: string
  department?: string
  avatar_url?: string
  role: string
  is_active: boolean
  joined_on: string
}

interface WorkingGroupMeeting {
  id: string
  title: string
  meeting_date: string
  start_time?: string
  end_time?: string
  location?: string
  status: string
}

interface WorkingGroupDocument {
  id: string
  title: string
  description?: string
  file_url: string
  document_type: string
  uploaded_at: string
  uploaded_by_name?: string
}

interface LinkedActivity {
  id: string
  title: string
  iati_id?: string
  activity_status: string
  partner_name: string
}

interface SubWorkingGroup {
  id: string
  code: string
  label: string
  group_type?: string
  is_active: boolean
  status?: string
  description?: string
  member_count?: number
}

interface WorkingGroupDetails {
  id: string
  code: string
  label: string
  slug?: string
  sector_code?: string
  description?: string
  is_active: boolean
  status: string
  group_type?: string
  banner?: string
  icon_url?: string
  parent_id?: string | null
  parent?: { id: string; code: string; label: string } | null
  created_at: string
  updated_at: string
  members: WorkingGroupMember[]
  meetings: WorkingGroupMeeting[]
  documents: WorkingGroupDocument[]
  activities: LinkedActivity[]
  sub_groups: SubWorkingGroup[]
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'chair': return 'bg-purple-100 text-purple-800'
    case 'co_chair': return 'bg-indigo-100 text-indigo-800'
    case 'deputy_chair': return 'bg-violet-100 text-violet-800'
    case 'secretariat': return 'bg-blue-100 text-blue-800'
    case 'member': return 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))]'
    case 'observer': return 'bg-muted text-foreground'
    default: return 'bg-muted text-foreground'
  }
}

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    chair: 'Chair', co_chair: 'Co-Chair', deputy_chair: 'Deputy Chair',
    secretariat: 'Secretariat', member: 'Member', observer: 'Observer',
  }
  return labels[role] || role
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))]'
    case 'cancelled': return 'bg-destructive/10 text-red-800'
    default: return 'bg-muted text-foreground'
  }
}

const getDocumentTypeIcon = (type: string) => {
  switch (type) {
    case 'terms_of_reference': return '📋'
    case 'minutes': return '📝'
    case 'report': return '📊'
    case 'presentation': return '📽️'
    case 'photo': return '📷'
    default: return '📄'
  }
}

export default function WorkingGroupProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [workingGroup, setWorkingGroup] = useState<WorkingGroupDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (params?.id) {
      fetchWorkingGroupDetails(params.id)
    }
  }, [params?.id])

  const fetchWorkingGroupDetails = async (id: string | string[]) => {
    try {
      const groupId = Array.isArray(id) ? id[0] : id
      const response = await apiFetch(`/api/working-groups/${groupId}`)
      if (!response.ok) throw new Error('Failed to fetch working group')

      const data = await response.json()

      const workingGroupData: WorkingGroupDetails = {
        ...data,
        status: data.status || (data.is_active ? 'active' : 'inactive'),
        members: data.members || [],
        meetings: data.meetings || [],
        documents: data.documents || [],
        activities: data.activities || [],
        sub_groups: data.sub_groups || [],
        parent: data.parent || null,
      }

      setWorkingGroup(workingGroupData)
    } catch (error) {
      console.error('Error fetching working group:', error)
      toast.error('Failed to load working group details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!workingGroup) return

    setIsDeleting(true)
    try {
      const response = await apiFetch(`/api/working-groups/${workingGroup.id}`, {
        method: 'DELETE',
      })

      if (response.ok || response.status === 204) {
        toast.success(`"${workingGroup.label}" was deleted successfully`)
        router.push('/working-groups')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete working group')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete working group')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-28 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </MainLayout>
    )
  }

  if (!workingGroup) {
    return (
      <MainLayout>
        <div>
          <Alert>
            <AlertDescription>Working group not found</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div>
        {/* Breadcrumbs */}
        <div className="mb-4">
          <Breadcrumbs items={[
            { label: "Working Groups", href: "/working-groups" },
            ...(workingGroup.parent ? [{ label: workingGroup.parent.label, href: `/working-groups/${workingGroup.parent.id}` }] : []),
            { label: workingGroup.label },
          ]} />
        </div>

        {/* Banner */}
        {workingGroup.banner ? (
          <div className="relative h-48 w-full rounded-xl overflow-hidden mb-6">
            <img src={workingGroup.banner} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end gap-4">
                {workingGroup.icon_url && (
                  <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex-shrink-0">
                    <img src={workingGroup.icon_url} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-white">{workingGroup.label}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs font-mono bg-white/20 text-white/80 px-1.5 py-0.5 rounded">{workingGroup.code}</code>
                    <span className="text-body text-white/70">{workingGroup.status === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-start gap-4">
              {workingGroup.icon_url && (
                <div className="w-14 h-14 rounded-full border-2 border-border shadow-sm overflow-hidden bg-card flex-shrink-0">
                  <img src={workingGroup.icon_url} alt="" className="w-full h-full object-contain p-1" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">{workingGroup.label}</h1>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{workingGroup.code}</code>
                  <span className="text-body text-muted-foreground">{workingGroup.status === 'active' ? 'Active' : 'Inactive'}</span>
                  {workingGroup.sector_code && (
                    <Badge variant="outline" className="text-helper">Sector {workingGroup.sector_code}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purpose/Mandate Section */}
        {workingGroup.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Purpose / Mandate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">
                {workingGroup.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
            <TabsTrigger value="members" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              Members ({workingGroup.members.length})
            </TabsTrigger>
            {workingGroup.sub_groups.length > 0 && (
              <TabsTrigger value="sub-groups" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <GitBranch className="h-4 w-4" />
                Sub-Groups ({workingGroup.sub_groups.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="meetings" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Calendar className="h-4 w-4" />
              Meetings ({workingGroup.meetings.length})
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              Activities ({workingGroup.activities.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              Documents ({workingGroup.documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Members ({workingGroup.members.length})</CardTitle>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/working-groups/${workingGroup.id}/edit?section=members`)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {workingGroup.members.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <UserPlus className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-body text-muted-foreground">No members yet</p>
                    <p className="text-helper text-muted-foreground mt-1">Add members to this working group to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-body">
                      <thead className="bg-surface-muted">
                        <tr className="border-b border-border">
                          <th className="text-left py-2.5 px-3 text-helper font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-2.5 px-3 text-helper font-medium text-muted-foreground">Role</th>
                          <th className="text-left py-2.5 px-3 text-helper font-medium text-muted-foreground">Organization</th>
                          <th className="text-left py-2.5 px-3 text-helper font-medium text-muted-foreground">Email</th>
                          <th className="text-left py-2.5 px-3 text-helper font-medium text-muted-foreground">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workingGroup.members.map((member) => (
                          <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  ) : (
                                    <span className="text-helper font-medium text-muted-foreground">
                                      {member.person_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <span className="font-medium text-foreground">{member.person_name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-body text-muted-foreground">
                              {getRoleLabel(member.role)}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-foreground">{member.person_organization || '—'}</div>
                              {(member.job_title || member.department) && (
                                <div className="text-helper text-muted-foreground mt-0.5">
                                  {[member.department, member.job_title].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {member.person_email ? (
                                <a href={`mailto:${member.person_email}`} className="hover:text-foreground transition-colors">{member.person_email}</a>
                              ) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              {member.joined_on ? format(new Date(member.joined_on), 'MMM d, yyyy') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sub-Groups Tab */}
          <TabsContent value="sub-groups">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Sub-Working Groups</CardTitle>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/working-groups/new?parent_id=${workingGroup.id}&parent_label=${encodeURIComponent(workingGroup.label)}`)}
                  >
                    <Plus className="h-4 w-4" />
                    Create Sub-Working Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workingGroup.sub_groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <GitBranch className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-body text-muted-foreground">No sub-working groups yet</p>
                      <p className="text-helper text-muted-foreground mt-1">Create sub-working groups to organize specialized topics</p>
                    </div>
                  ) : (
                    workingGroup.sub_groups.map((sg) => (
                      <Link
                        key={sg.id}
                        href={`/working-groups/${sg.id}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <h4 className="font-medium text-foreground">{sg.label}</h4>
                            <Badge variant={sg.is_active ? 'default' : 'secondary'} className="text-[10px]">
                              {sg.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {sg.description && (
                            <p className="text-body text-muted-foreground mt-1 ml-6 line-clamp-1">{sg.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 ml-6 text-helper text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {sg.member_count || 0} members
                            </span>
                            <span className="font-mono">{sg.code}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Meetings</CardTitle>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/working-groups/${workingGroup.id}/edit?section=meetings`)}
                  >
                    <Plus className="h-4 w-4" />
                    Schedule Meeting
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workingGroup.meetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-body text-muted-foreground">No meetings scheduled</p>
                      <p className="text-helper text-muted-foreground mt-1">Schedule meetings to coordinate with working group members</p>
                    </div>
                  ) : (
                    workingGroup.meetings.map((meeting) => (
                      <div key={meeting.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{meeting.title}</h4>
                              <Badge className={getStatusBadgeColor(meeting.status)}>
                                {meeting.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-body text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                              </div>
                              {meeting.start_time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {meeting.start_time}{meeting.end_time ? ` - ${meeting.end_time}` : ''}
                                </div>
                              )}
                              {meeting.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {meeting.location}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Associated Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workingGroup.activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-body text-muted-foreground">No activities linked</p>
                      <p className="text-helper text-muted-foreground mt-1">Activities associated with this working group will appear here</p>
                    </div>
                  ) : (
                    workingGroup.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/activities/${activity.id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{activity.title}</h4>
                            <p className="text-body text-muted-foreground mt-1">
                              {activity.iati_id && <span>{activity.iati_id} &middot; </span>}
                              {activity.partner_name}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {activity.activity_status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Documents</CardTitle>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/working-groups/${workingGroup.id}/edit?section=documents`)}
                  >
                    <Plus className="h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workingGroup.documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-body text-muted-foreground">No documents uploaded</p>
                      <p className="text-helper text-muted-foreground mt-1">Upload documents to share with working group members</p>
                    </div>
                  ) : (
                    workingGroup.documents.map((doc) => (
                      <div key={doc.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getDocumentTypeIcon(doc.document_type)}</span>
                              <div>
                                <h4 className="font-medium">{doc.title}</h4>
                                {doc.description && (
                                  <p className="text-body text-muted-foreground mt-1">{doc.description}</p>
                                )}
                                <p className="text-helper text-muted-foreground mt-1">
                                  Uploaded on {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                                  {doc.uploaded_by_name && ` by ${doc.uploaded_by_name}`}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Working Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{workingGroup.label}&quot;? This action cannot be undone.
              All members, meetings, and documents will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  )
}
