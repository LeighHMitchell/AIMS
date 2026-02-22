"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Pencil,
  Save,
  Users,
  FileText,
  Calendar,
  Plus,
  MoreVertical,
  Mail,
  Building,
  UserPlus,
  Trash2,
  Download,
  Clock,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface WorkingGroupMember {
  id: string
  person_name: string
  person_email?: string
  person_organization?: string
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

interface WorkingGroupDetails {
  id: string
  code: string
  label: string
  slug?: string
  sector_code?: string
  description?: string
  is_active: boolean
  status: string
  created_at: string
  updated_at: string
  members: WorkingGroupMember[]
  meetings: WorkingGroupMeeting[]
  documents: WorkingGroupDocument[]
  activities: LinkedActivity[]
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'chair': return 'bg-purple-100 text-purple-800'
    case 'co_chair': return 'bg-indigo-100 text-indigo-800'
    case 'deputy_chair': return 'bg-violet-100 text-violet-800'
    case 'secretariat': return 'bg-blue-100 text-blue-800'
    case 'member': return 'bg-green-100 text-green-800'
    case 'observer': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
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
    case 'completed': return 'bg-green-100 text-green-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
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
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
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
        activities: data.activities || []
      }

      setWorkingGroup(workingGroupData)
      setEditedDescription(data.description || '')
    } catch (error) {
      console.error('Error fetching working group:', error)
      toast.error('Failed to load working group details')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDescription = async () => {
    if (!workingGroup) return

    try {
      const response = await apiFetch(`/api/working-groups/${workingGroup.id}`, {
        method: 'PUT',
        body: JSON.stringify({ description: editedDescription }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update description')
      }

      toast.success('Description updated successfully')
      setWorkingGroup({ ...workingGroup, description: editedDescription })
      setIsEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update description')
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (!workingGroup) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertDescription>Working group not found</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/working-groups')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Working Groups
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{workingGroup.label}</h1>
                <Badge variant={workingGroup.status === 'active' ? 'default' : 'secondary'}>
                  {workingGroup.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">{workingGroup.code}</p>
              {workingGroup.sector_code && (
                <Badge variant="outline" className="mt-2">
                  Sector {workingGroup.sector_code}
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/working-groups/${workingGroup.id}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/working-groups/${workingGroup.id}/edit?section=members`)}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                  Delete Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Purpose/Mandate Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Purpose / Mandate</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={6}
                  placeholder="Enter working group purpose and mandate..."
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveDescription}><Save className="h-4 w-4 mr-2" />Save</Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false)
                    setEditedDescription(workingGroup.description || '')
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-foreground whitespace-pre-wrap">
                {workingGroup.description || 'No description available'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
            <TabsTrigger value="members" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              Members ({workingGroup.members.length})
            </TabsTrigger>
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
                  <CardTitle>Members</CardTitle>
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
                <div className="space-y-4">
                  {workingGroup.members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <UserPlus className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No members yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add members to this working group to get started</p>
                    </div>
                  ) : (
                    workingGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">{member.person_name}</h4>
                            <Badge className={getRoleBadgeColor(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          </div>
                          <div className="mt-1 space-y-1">
                            {member.person_organization && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building className="h-4 w-4" />
                                {member.person_organization}
                              </div>
                            )}
                            {member.person_email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                {member.person_email}
                              </div>
                            )}
                            {member.joined_on && (
                              <p className="text-xs text-muted-foreground">
                                Joined {format(new Date(member.joined_on), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
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
                      <p className="text-sm text-muted-foreground">No meetings scheduled</p>
                      <p className="text-xs text-muted-foreground mt-1">Schedule meetings to coordinate with working group members</p>
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
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
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
                      <p className="text-sm text-muted-foreground">No activities linked</p>
                      <p className="text-xs text-muted-foreground mt-1">Activities associated with this working group will appear here</p>
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
                            <p className="text-sm text-muted-foreground mt-1">
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
                      <p className="text-sm text-muted-foreground">No documents uploaded</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload documents to share with working group members</p>
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
                                  <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
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
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  )
}
