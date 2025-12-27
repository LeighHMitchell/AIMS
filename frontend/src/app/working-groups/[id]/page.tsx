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
  Edit, 
  Users, 
  FileText, 
  Calendar,
  Plus,
  MoreVertical,
  Mail,
  Building,
  UserPlus,
  Trash2,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WorkingGroupMember {
  id: string
  person_id: string
  person_name: string
  person_email?: string
  person_organization?: string
  role: 'chair' | 'secretary' | 'member' | 'observer'
  is_active: boolean
  joined_on: string
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
  slug: string
  sector_code?: string
  description?: string
  is_active: boolean
  status: string
  created_at: string
  updated_at: string
  members: WorkingGroupMember[]
  documents: WorkingGroupDocument[]
  activities: LinkedActivity[]
}

export default function WorkingGroupProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [workingGroup, setWorkingGroup] = useState<WorkingGroupDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')

  useEffect(() => {
    if (params?.id) {
      fetchWorkingGroupDetails(params.id)
    }
  }, [params?.id])

  const fetchWorkingGroupDetails = async (id: string | string[]) => {
    try {
      const groupId = Array.isArray(id) ? id[0] : id
      const response = await fetch(`/api/working-groups/${groupId}`)
      if (!response.ok) throw new Error('Failed to fetch working group')
      
      const data = await response.json()
      
      // Mock additional data for demonstration
      const mockData: WorkingGroupDetails = {
        ...data,
        status: data.status || (data.is_active ? 'active' : 'inactive'),
        members: [
          {
            id: '1',
            person_id: 'p1',
            person_name: 'Dr. Sarah Johnson',
            person_email: 'sarah.johnson@mop.gov',
            person_organization: 'Ministry of Planning',
            role: 'chair',
            is_active: true,
            joined_on: '2024-01-15'
          },
          {
            id: '2',
            person_id: 'p2',
            person_name: 'John Smith',
            person_email: 'john.smith@undp.org',
            person_organization: 'UNDP',
            role: 'secretary',
            is_active: true,
            joined_on: '2024-01-20'
          },
          {
            id: '3',
            person_id: 'p3',
            person_name: 'Jane Doe',
            person_email: 'jane.doe@worldbank.org',
            person_organization: 'World Bank',
            role: 'member',
            is_active: true,
            joined_on: '2024-02-01'
          }
        ],
        documents: [
          {
            id: 'd1',
            title: 'Terms of Reference',
            description: 'Official ToR for the working group',
            file_url: '#',
            document_type: 'tor',
            uploaded_at: '2024-01-10',
            uploaded_by_name: 'Admin'
          },
          {
            id: 'd2',
            title: 'Q1 2024 Meeting Minutes',
            description: 'Minutes from the quarterly meeting',
            file_url: '#',
            document_type: 'minutes',
            uploaded_at: '2024-03-30',
            uploaded_by_name: 'Secretary'
          }
        ],
        activities: [
          {
            id: 'a1',
            title: 'Health System Strengthening Project',
            iati_id: 'MM-1-HSS-2024',
            activity_status: 'implementation',
            partner_name: 'WHO'
          },
          {
            id: 'a2',
            title: 'Primary Healthcare Infrastructure Development',
            iati_id: 'MM-1-PHC-2024',
            activity_status: 'implementation',
            partner_name: 'JICA'
          }
        ]
      }
      
      setWorkingGroup(mockData)
      setEditedDescription(mockData.description || '')
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
      // TODO: Implement API call to save description
      toast.success('Description updated successfully')
      setWorkingGroup({
        ...workingGroup,
        description: editedDescription
      })
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update description')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'chair': return 'bg-purple-100 text-purple-800'
      case 'secretary': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      case 'observer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'tor': return '📋'
      case 'minutes': return '📝'
      case 'report': return '📊'
      default: return '📄'
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
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{workingGroup.label}</h1>
                <Badge variant={workingGroup.status === 'active' ? 'default' : 'secondary'}>
                  {workingGroup.status}
                </Badge>
              </div>
              <p className="text-gray-600 mt-1">{workingGroup.code}</p>
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
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
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
                <Edit className="h-4 w-4" />
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
                  <Button onClick={handleSaveDescription}>Save</Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false)
                    setEditedDescription(workingGroup.description || '')
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {workingGroup.description || 'No description available'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6">
            <TabsTrigger value="members" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" />
              Members ({workingGroup.members.length})
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4" />
              Activities ({workingGroup.activities.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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
                  <Button size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workingGroup.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{member.person_name}</h4>
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role}
                          </Badge>
                        </div>
                        <div className="mt-1 space-y-1">
                          {member.person_organization && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Building className="h-4 w-4" />
                              {member.person_organization}
                            </div>
                          )}
                          {member.person_email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              {member.person_email}
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            Joined {format(new Date(member.joined_on), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
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
                  {workingGroup.activities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/activities/${activity.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{activity.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.iati_id} • {activity.partner_name}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {activity.activity_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
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
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workingGroup.documents.map((doc) => (
                    <div key={doc.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getDocumentTypeIcon(doc.document_type)}</span>
                            <div>
                              <h4 className="font-medium">{doc.title}</h4>
                              {doc.description && (
                                <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Uploaded on {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                                {doc.uploaded_by_name && ` by ${doc.uploaded_by_name}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
