"use client"

import React, { useState, useEffect, useCallback } from 'react'
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
import { Calendar, Clock, MapPin, Plus, ChevronDown, ChevronUp, Trash2, FileText } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Meeting {
  id: string
  title: string
  meeting_date: string
  start_time?: string
  end_time?: string
  location?: string
  agenda?: string
  minutes?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

interface MeetingsSectionProps {
  workingGroupId: string
}

export default function MeetingsSection({ workingGroupId }: MeetingsSectionProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingMinutes, setEditingMinutes] = useState<string | null>(null)
  const [minutesText, setMinutesText] = useState('')

  // New meeting form
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [newLocation, setNewLocation] = useState('')
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
      setNewAgenda('')
      fetchMeetings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create meeting')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (meetingId: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/meetings/${meetingId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success('Status updated')
      fetchMeetings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const handleSaveMinutes = async (meetingId: string) => {
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/meetings/${meetingId}`, {
        method: 'PUT',
        body: JSON.stringify({ minutes: minutesText }),
      })
      if (!res.ok) throw new Error('Failed to save minutes')
      toast.success('Minutes saved')
      setEditingMinutes(null)
      fetchMeetings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save minutes')
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
    return <div className="animate-pulse space-y-4"><div className="h-24 bg-gray-100 rounded" /><div className="h-24 bg-gray-100 rounded" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Meetings & Minutes</h2>
          <p className="text-sm text-gray-500 mt-1">Schedule meetings, take attendance, and record minutes</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Meeting
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <Calendar className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">No meetings scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first meeting to get started</p>
          <Button onClick={() => setShowAddDialog(true)} variant="outline" className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isExpanded = expandedMeeting === meeting.id
            return (
              <div key={meeting.id} className="border rounded-lg overflow-hidden">
                {/* Meeting Header */}
                <div
                  className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedMeeting(isExpanded ? null : meeting.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{meeting.title}</h4>
                      <Badge className={STATUS_COLORS[meeting.status] || STATUS_COLORS.scheduled}>
                        {meeting.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
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
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4 bg-gray-50">
                    {/* Status change & Delete */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={meeting.status}
                        onValueChange={(val) => handleStatusChange(meeting.id, val)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 ml-auto"
                        onClick={(e) => { e.stopPropagation(); setMeetingToDelete(meeting) }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>

                    {/* Agenda */}
                    {meeting.agenda && (
                      <div>
                        <Label className="text-sm font-medium">Agenda</Label>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                          {meeting.agenda}
                        </p>
                      </div>
                    )}

                    {/* Minutes */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Minutes</Label>
                        {editingMinutes !== meeting.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMinutes(meeting.id)
                              setMinutesText(meeting.minutes || '')
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {meeting.minutes ? 'Edit Minutes' : 'Add Minutes'}
                          </Button>
                        )}
                      </div>
                      {editingMinutes === meeting.id ? (
                        <div className="space-y-2 mt-2">
                          <Textarea
                            value={minutesText}
                            onChange={(e) => setMinutesText(e.target.value)}
                            rows={8}
                            placeholder="Enter meeting minutes..."
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveMinutes(meeting.id)}>
                              Save Minutes
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingMinutes(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : meeting.minutes ? (
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                          {meeting.minutes}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-400 italic">No minutes recorded</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Meeting Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>Create a new meeting for this working group</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Meeting room or virtual link"
              />
            </div>
            <div className="space-y-2">
              <Label>Agenda</Label>
              <Textarea
                value={newAgenda}
                onChange={(e) => setNewAgenda(e.target.value)}
                placeholder="Meeting agenda items..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
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
