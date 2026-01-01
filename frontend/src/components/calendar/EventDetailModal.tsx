'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar, 
  Clock, 
  Link as LinkIcon, 
  Bell, 
  Video, 
  Sparkles, 
  Puzzle, 
  Users, 
  X, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown,
  Check,
  HelpCircle,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  Tag,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/hooks/useUser'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end?: string
  location?: string
  type: 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other'
  status: 'pending' | 'approved'
  organizerId: string
  organizerName: string
  attendees?: string[]
  meetingLink?: string
  notificationMinutes?: number
  recordingEnabled?: boolean
  aiNotetaking?: boolean
  integrations?: string[]
  createdAt: string
  updatedAt: string
}

interface EventDetailModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEventUpdated: () => void
  onEventDeleted?: () => void
  canEdit?: boolean
}

interface Participant {
  id: string
  name: string
  email?: string
  status: 'yes' | 'no' | 'maybe' | 'pending'
  avatar?: string
}

export function EventDetailModal({ 
  isOpen, 
  onClose, 
  event, 
  onEventUpdated,
  onEventDeleted,
  canEdit = false 
}: EventDetailModalProps) {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    type: 'meeting' as 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other',
    meetingLink: '',
    meetingLinkType: 'google-meet' as 'google-meet' | 'zoom' | 'teams' | 'other',
    notificationMinutes: 30,
    recordingEnabled: false,
    aiNotetaking: false,
    integrations: [] as string[]
  })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [rsvpStatus, setRsvpStatus] = useState<'yes' | 'no' | 'maybe' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start: event.start ? new Date(event.start).toISOString().slice(0, 16) : '',
        end: event.end ? new Date(event.end).toISOString().slice(0, 16) : '',
        location: event.location || '',
        type: event.type || 'meeting',
        meetingLink: event.meetingLink || '',
        meetingLinkType: 'google-meet',
        notificationMinutes: event.notificationMinutes || 30,
        recordingEnabled: event.recordingEnabled || false,
        aiNotetaking: event.aiNotetaking || false,
        integrations: event.integrations || []
      })
      
      // Convert attendees to participants
      if (event.attendees) {
        setParticipants(event.attendees.map((attendee, index) => ({
          id: index.toString(),
          name: attendee,
          status: 'pending' as const,
          email: attendee.includes('@') ? attendee : undefined
        })))
      }
    }
  }, [event])

  if (!isOpen || !event) return null

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  const calculateDuration = () => {
    if (!formData.start || !formData.end) return ''
    const start = new Date(formData.start)
    const end = new Date(formData.end)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.round(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getRelativeTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`
    return formatDate(dateString)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    }
    
    if (!formData.start) {
      newErrors.start = 'Start date and time is required'
    }
    
    if (formData.end && new Date(formData.end) <= new Date(formData.start)) {
      newErrors.end = 'End time must be after start time'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdate = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/calendar-events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          start: formData.start,
          end: formData.end,
          location: formData.location,
          type: formData.type,
          meetingLink: formData.meetingLink,
          notificationMinutes: formData.notificationMinutes,
          recordingEnabled: formData.recordingEnabled,
          aiNotetaking: formData.aiNotetaking,
          integrations: formData.integrations
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update event')
      }

      toast.success('Event updated successfully!')
      setIsEditing(false)
      onEventUpdated()
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/calendar-events/${event.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      toast.success('Event deleted successfully!')
      onEventDeleted?.()
      onClose()
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    } finally {
      setLoading(false)
    }
  }

  const isOrganizer = user?.id === event.organizerId

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-xl rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg bg-[#dc2625] flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="text-xl font-semibold border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 mb-1"
                  />
                ) : (
                  <h2 className="text-xl font-semibold mb-1">{event.title}</h2>
                )}
                <div className="text-sm text-[#4c5568] flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {getRelativeTime(event.start)}, {formatTime(event.start)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (isOrganizer || user?.role === 'admin') && (
                <>
                  {!isEditing ? (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  )}
                  {(isOrganizer || user?.role === 'admin') && (
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-[#dc2625]">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ChevronUp className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Date */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <Calendar className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Date</Label>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <>
                    <Input
                      type="datetime-local"
                      value={formData.start}
                      onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                      className="hidden"
                      id="date-input"
                    />
                    <Badge 
                      variant="secondary" 
                      className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal cursor-pointer"
                      onClick={() => document.getElementById('date-input')?.click()}
                    >
                      {formData.start ? formatDate(formData.start) : 'Select date'}
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal">
                    {formatDate(event.start)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <Clock className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Time</Label>
              </div>
              <div className="flex-1 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Badge 
                      variant="secondary" 
                      className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal cursor-pointer"
                      onClick={() => document.getElementById('start-time-input')?.click()}
                    >
                      {formData.start ? formatTime(formData.start) : 'Start'}
                    </Badge>
                    <Input
                      type="datetime-local"
                      value={formData.start}
                      onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                      className="hidden"
                      id="start-time-input"
                    />
                    <span className="text-[#4c5568] text-sm">to</span>
                    <Badge 
                      variant="secondary" 
                      className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal cursor-pointer"
                      onClick={() => document.getElementById('end-time-input')?.click()}
                    >
                      {formData.end ? formatTime(formData.end) : 'End'}
                    </Badge>
                    <Input
                      type="datetime-local"
                      value={formData.end}
                      onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
                      className="hidden"
                      id="end-time-input"
                    />
                    {formData.start && formData.end && (
                      <span className="text-[#4c5568] text-sm">({calculateDuration()})</span>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal">
                      {formatTime(event.start)}
                    </Badge>
                    {event.end && (
                      <>
                        <span className="text-[#4c5568] text-sm">to</span>
                        <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal">
                          {formatTime(event.end)}
                        </Badge>
                        <span className="text-[#4c5568] text-sm">({calculateDuration()})</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Event Type */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <Tag className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Event Type</Label>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="w-auto border-0 bg-[#f1f4f8] h-auto px-3 py-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal capitalize">
                    {event.type || 'Other'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <MapPin className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Location</Label>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter location"
                    className="bg-[#f1f4f8] border-0"
                  />
                ) : (
                  <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal">
                    {event.location || 'Not specified'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Organizer */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <User className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Organizer</Label>
              </div>
              <div className="flex-1">
                <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal">
                  {event.organizerName || 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* Link */}
            {(event.meetingLink || isEditing) && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                  <LinkIcon className="h-4 w-4 text-[#4c5568]" />
                  <Label className="text-sm font-medium text-[#4c5568]">Link</Label>
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <Select 
                      value={formData.meetingLinkType} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, meetingLinkType: value }))}
                    >
                      <SelectTrigger className="w-auto border-0 bg-[#f1f4f8] h-auto px-3 py-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google-meet">Google Meet</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    event.meetingLink && (
                      <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal">
                        Google Meet
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Notification */}
            {(event.notificationMinutes !== undefined || isEditing) && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                  <Bell className="h-4 w-4 text-[#4c5568]" />
                  <Label className="text-sm font-medium text-[#4c5568]">Notification</Label>
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <Select 
                      value={formData.notificationMinutes.toString()} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, notificationMinutes: parseInt(value) }))}
                    >
                      <SelectTrigger className="w-auto border-0 bg-[#f1f4f8] h-auto px-3 py-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">At time of event</SelectItem>
                        <SelectItem value="5">5 minutes before</SelectItem>
                        <SelectItem value="15">15 minutes before</SelectItem>
                        <SelectItem value="30">30 minutes before</SelectItem>
                        <SelectItem value="60">1 hour before</SelectItem>
                        <SelectItem value="1440">1 day before</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal">
                      {event.notificationMinutes === 0 ? 'At time of event' : `${event.notificationMinutes} minutes before`}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Recording */}
            {(event.recordingEnabled !== undefined || isEditing) && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                  <Video className="h-4 w-4 text-[#4c5568]" />
                  <Label className="text-sm font-medium text-[#4c5568]">Recording</Label>
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <Switch
                      checked={formData.recordingEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, recordingEnabled: checked }))}
                    />
                  ) : (
                    <Switch checked={event.recordingEnabled || false} disabled />
                  )}
                </div>
              </div>
            )}

            {/* AI notetaking */}
            {(event.aiNotetaking !== undefined || isEditing) && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-[#4c5568]" />
                  <Label className="text-sm font-medium text-[#4c5568]">AI notetaking</Label>
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <Switch
                      checked={formData.aiNotetaking}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aiNotetaking: checked }))}
                    />
                  ) : (
                    <Switch checked={event.aiNotetaking || false} disabled />
                  )}
                </div>
              </div>
            )}

            {/* Integrations */}
            {((event.integrations && event.integrations.length > 0) || isEditing) && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                  <Puzzle className="h-4 w-4 text-[#4c5568]" />
                  <Label className="text-sm font-medium text-[#4c5568]">Integrations</Label>
                </div>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {isEditing ? (
                    <>
                      {formData.integrations.map((integration) => (
                        <Badge 
                          key={integration} 
                          variant="secondary" 
                          className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal"
                        >
                          {integration}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-2 hover:bg-transparent"
                            onClick={() => setFormData(prev => ({ ...prev, integrations: prev.integrations.filter(i => i !== integration) }))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0 border border-[#cfd0d5] hover:bg-[#f1f4f8]"
                        onClick={() => setFormData(prev => ({ ...prev, integrations: [...prev.integrations, 'Attio'] }))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    event.integrations?.map((integration) => (
                      <Badge 
                        key={integration} 
                        variant="secondary" 
                        className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal"
                      >
                        {integration}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">
                  Participants {event.attendees && event.attendees.length > 0 && `(${event.attendees.length})`}
                </Label>
              </div>
              {event.attendees && event.attendees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {participants.map((participant) => (
                    <Badge 
                      key={participant.id} 
                      variant="secondary" 
                      className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal flex items-center gap-2"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="text-xs bg-[#7b95a7] text-white">
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                      {participant.status === 'yes' && (
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {participant.status === 'maybe' && (
                        <HelpCircle className="h-4 w-4 text-[#4c5568]" />
                      )}
                      {participant.status === 'pending' && (
                        <HelpCircle className="h-4 w-4 text-[#cfd0d5]" />
                      )}
                      <span>{participant.name}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#4c5568] italic">No participants added yet</p>
              )}
            </div>

            {/* Description */}
            {(event.description || isEditing) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-[#4c5568]">Description</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  >
                    {descriptionExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {descriptionExpanded && (
                  isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter event description"
                      rows={4}
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-sm text-[#4c5568] whitespace-pre-wrap">{event.description}</p>
                  )
                )}
              </div>
            )}

            {/* RSVP Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#cfd0d5]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#4c5568]">Going?</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={rsvpStatus === 'yes' ? 'default' : 'outline'}
                    size="sm"
                    className={rsvpStatus === 'yes' ? 'bg-[#dc2625] hover:bg-[#dc2625]/90' : ''}
                    onClick={() => setRsvpStatus(rsvpStatus === 'yes' ? null : 'yes')}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={rsvpStatus === 'no' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRsvpStatus(rsvpStatus === 'no' ? null : 'no')}
                  >
                    No
                  </Button>
                  <Button
                    type="button"
                    variant={rsvpStatus === 'maybe' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRsvpStatus(rsvpStatus === 'maybe' ? null : 'maybe')}
                  >
                    Maybe
                  </Button>
                </div>
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleUpdate}
                    disabled={loading}
                    className="bg-[#dc2625] hover:bg-[#dc2625]/90"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
              {!isEditing && (
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



