"use client"

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Calendar, Plus, Trash2, FileText, Upload, Download, Pencil, X, Loader2, MapPin } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import { format } from 'date-fns'

// Dynamic import LocationPicker (uses MapLibre GL which needs window)
const LocationPicker = dynamic(
  () => import('./LocationPicker'),
  { ssr: false, loading: () => <div className="h-[280px] bg-muted rounded-lg animate-pulse" /> }
)

interface Meeting {
  id: string
  title: string
  meeting_date: string
  start_time?: string
  end_time?: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  agenda?: string
  minutes?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  created_at: string
}

interface MeetingDocument {
  id: string
  title: string
  file_url: string
  document_type: string
  uploaded_at: string
}

const DOC_TYPE_OPTIONS = [
  { value: 'agenda', label: 'Agenda' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'report', label: 'Report' },
  { value: 'other', label: 'Other' },
]

// ---------- Edit Meeting Modal ----------
interface EditMeetingModalProps {
  meeting: Meeting
  workingGroupId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
  onDelete: (meeting: Meeting) => void
}

function EditMeetingModal({
  meeting,
  workingGroupId,
  open,
  onClose,
  onSaved,
  onDelete,
}: EditMeetingModalProps) {
  const [title, setTitle] = useState(meeting.title)
  const [meetingDate, setMeetingDate] = useState(meeting.meeting_date)
  const [startTime, setStartTime] = useState(meeting.start_time || '')
  const [endTime, setEndTime] = useState(meeting.end_time || '')
  const [location, setLocation] = useState(meeting.location || '')
  const [latitude, setLatitude] = useState<number | null>(meeting.latitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(meeting.longitude ?? null)
  const [status, setStatus] = useState(meeting.status)
  const [agenda, setAgenda] = useState(meeting.agenda || '')
  const [saving, setSaving] = useState(false)

  // Documents
  const [docs, setDocs] = useState<MeetingDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadDocType, setUploadDocType] = useState('agenda')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Reset form when meeting changes
  useEffect(() => {
    setTitle(meeting.title)
    setMeetingDate(meeting.meeting_date)
    setStartTime(meeting.start_time || '')
    setEndTime(meeting.end_time || '')
    setLocation(meeting.location || '')
    setLatitude(meeting.latitude ?? null)
    setLongitude(meeting.longitude ?? null)
    setStatus(meeting.status)
    setAgenda(meeting.agenda || '')
  }, [meeting])

  // Fetch documents when modal opens
  useEffect(() => {
    if (!open) return
    const fetchDocs = async () => {
      setLoadingDocs(true)
      try {
        const res = await apiFetch(`/api/working-groups/${workingGroupId}/documents?meeting_id=${meeting.id}`)
        if (res.ok) {
          const data = await res.json()
          setDocs(data)
        }
      } catch (error) {
        console.error('Error fetching meeting docs:', error)
      } finally {
        setLoadingDocs(false)
      }
    }
    fetchDocs()
  }, [open, workingGroupId, meeting.id])

  const handleSave = async () => {
    if (!title.trim() || !meetingDate) {
      toast.error('Title and date are required')
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/meetings/${meeting.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          meeting_date: meetingDate,
          start_time: startTime || null,
          end_time: endTime || null,
          location: location.trim() || null,
          latitude: latitude,
          longitude: longitude,
          status,
          agenda: agenda.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save meeting')
      toast.success('Meeting updated')
      onSaved()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save meeting')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadDoc = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)
      formData.append('document_type', uploadDocType)
      formData.append('meeting_id', meeting.id)

      const res = await fetch(`/api/working-groups/${workingGroupId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const newDoc = await res.json()
      toast.success('Document uploaded')
      setDocs(prev => [...prev, newDoc])
    } catch {
      toast.error('Failed to upload document')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/documents`, {
        method: 'DELETE',
        body: JSON.stringify({ document_id: docId }),
      })
      if (!res.ok && res.status !== 204) throw new Error('Delete failed')
      toast.success('Document removed')
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch {
      toast.error('Failed to remove document')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 mx-0 mt-0 px-6 py-4 border-b">
          <DialogTitle>Edit Meeting</DialogTitle>
          <DialogDescription>Update meeting details, location, and documents</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-4 overflow-y-auto flex-1">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" />
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Meeting['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start/End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Location with Map */}
          <LocationPicker
            location={location}
            setLocation={setLocation}
            latitude={latitude}
            longitude={longitude}
            setLatitude={setLatitude}
            setLongitude={setLongitude}
          />

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Meeting description..."
              rows={4}
            />
          </div>

          {/* Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Documents</Label>
              <div className="flex items-center gap-2">
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUploadDoc(file)
              }}
            />

            {loadingDocs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading documents...
              </div>
            ) : docs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">No documents attached</p>
            ) : (
              <div className="space-y-1">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-muted border rounded px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground truncate">{doc.title}</span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">{doc.document_type}</Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-muted-foreground hover:text-blue-600 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-card z-10 px-6 py-4 border-t flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              onClose()
              onDelete(meeting)
            }}
          >
            <Trash2 className="h-4 w-4 mr-1 text-red-500" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || !meetingDate}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Meetings Table ----------
interface MeetingsTableProps {
  meetings: Meeting[]
  workingGroupId: string
  onEdit: (meeting: Meeting) => void
  onDelete: (meeting: Meeting) => void
}

function MeetingsTable({ meetings, workingGroupId, onEdit, onDelete }: MeetingsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted border-b">
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Title</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Time</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Location</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {meetings.map((meeting) => (
            <tr key={meeting.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium text-foreground">{meeting.title}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {meeting.start_time
                  ? `${meeting.start_time}${meeting.end_time ? ` – ${meeting.end_time}` : ''}`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {meeting.latitude && meeting.longitude && (
                    <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[200px]">{meeting.location || '—'}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{meeting.status}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-blue-700"
                    onClick={() => onEdit(meeting)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => onDelete(meeting)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Main Section ----------
interface MeetingsSectionProps {
  workingGroupId: string
}

export default function MeetingsSection({ workingGroupId }: MeetingsSectionProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null)
  const [saving, setSaving] = useState(false)

  // New meeting form
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newLatitude, setNewLatitude] = useState<number | null>(null)
  const [newLongitude, setNewLongitude] = useState<number | null>(null)
  const [newAgenda, setNewAgenda] = useState('')

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/meetings`)
      if (res.ok) {
        const data = await res.json()
        setMeetings(data)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }, [workingGroupId])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  const handleAddMeeting = async () => {
    if (!newTitle.trim() || !newDate) {
      toast.error('Title and date are required')
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/meetings`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          meeting_date: newDate,
          start_time: newStartTime || null,
          end_time: newEndTime || null,
          location: newLocation.trim() || null,
          latitude: newLatitude,
          longitude: newLongitude,
          agenda: newAgenda.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create meeting')
      }

      toast.success('Meeting created')
      setShowAddDialog(false)
      setNewTitle('')
      setNewDate('')
      setNewStartTime('')
      setNewEndTime('')
      setNewLocation('')
      setNewLatitude(null)
      setNewLongitude(null)
      setNewAgenda('')
      fetchMeetings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create meeting')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMeeting = async () => {
    if (!meetingToDelete) return
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/meetings/${meetingToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete meeting')
      toast.success('Meeting deleted')
      setMeetingToDelete(null)
      fetchMeetings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete meeting')
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Meetings & Minutes</h2>
          <p className="text-sm text-muted-foreground mt-1">Schedule meetings, take attendance, and record minutes</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Meeting
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No meetings scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first meeting to get started</p>
          <Button onClick={() => setShowAddDialog(true)} variant="outline" className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const today = new Date().toISOString().split('T')[0]
            const upcoming = meetings.filter(m => m.meeting_date >= today && m.status !== 'cancelled')
            const past = meetings.filter(m => m.meeting_date < today || m.status === 'cancelled')

            return (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Upcoming Meetings
                    {upcoming.length > 0 && <span className="ml-2 text-muted-foreground font-normal">({upcoming.length})</span>}
                  </h3>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg">No upcoming meetings</p>
                  ) : (
                    <MeetingsTable
                      meetings={upcoming}
                      workingGroupId={workingGroupId}
                      onEdit={setEditingMeeting}
                      onDelete={setMeetingToDelete}
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Past Meetings
                    {past.length > 0 && <span className="ml-2 text-muted-foreground font-normal">({past.length})</span>}
                  </h3>
                  {past.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg">No past meetings</p>
                  ) : (
                    <MeetingsTable
                      meetings={past}
                      workingGroupId={workingGroupId}
                      onEdit={setEditingMeeting}
                      onDelete={setMeetingToDelete}
                    />
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          workingGroupId={workingGroupId}
          open={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onSaved={fetchMeetings}
          onDelete={(m) => setMeetingToDelete(m)}
        />
      )}

      {/* Add Meeting Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="sticky top-0 z-10 mx-0 mt-0 px-6 py-4 border-b">
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>Create a new meeting for this working group</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label>Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Q1 Review Meeting"
              />
            </div>
            <div className="space-y-2">
              <Label>Date <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Location with Map */}
            <LocationPicker
              location={newLocation}
              setLocation={setNewLocation}
              latitude={newLatitude}
              longitude={newLongitude}
              setLatitude={setNewLatitude}
              setLongitude={setNewLongitude}
            />

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newAgenda}
                onChange={(e) => setNewAgenda(e.target.value)}
                placeholder="Meeting description..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-card z-10 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddMeeting} disabled={saving || !newTitle.trim() || !newDate}>
              {saving ? 'Creating...' : 'Create Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!meetingToDelete} onOpenChange={() => setMeetingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{meetingToDelete?.title}&quot;? This will also remove all attendee records and attached documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMeeting} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
