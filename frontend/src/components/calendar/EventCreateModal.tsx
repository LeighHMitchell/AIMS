'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DatePicker } from '@/components/ui/date-picker'
import { MapSearch } from '@/components/maps/MapSearch'
import { 
  Calendar, 
  Clock, 
  Link as LinkIcon, 
  Bell, 
  Users, 
  X, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown,
  Check,
  HelpCircle,
  MoreVertical,
  Search,
  MapPin,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/hooks/useUser'
import { format } from 'date-fns'

interface EventCreateModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date | null
  onEventCreated: () => void
}

interface Participant {
  id: string
  name: string
  email?: string
  status: 'yes' | 'no' | 'maybe' | 'pending'
  avatar?: string
  profile_photo?: string
}

interface RolodexPerson {
  id: string
  name: string
  email?: string
  profile_photo?: string
  first_name?: string
  last_name?: string
}

export function EventCreateModal({ isOpen, onClose, selectedDate, onEventCreated }: EventCreateModalProps) {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(true)
  const [selectedDateValue, setSelectedDateValue] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [participantSearchOpen, setParticipantSearchOpen] = useState(false)
  const [participantSearchQuery, setParticipantSearchQuery] = useState('')
  const [rolodexPeople, setRolodexPeople] = useState<RolodexPerson[]>([])
  const [allContacts, setAllContacts] = useState<RolodexPerson[]>([])
  const [searchingPeople, setSearchingPeople] = useState(false)
  const [contactsLoaded, setContactsLoaded] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    type: 'meeting' as 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other',
    attendees: [] as string[],
    meetingLink: '',
    meetingLinkType: 'google-meet' as 'google-meet' | 'zoom' | 'teams' | 'other',
    notificationMinutes: 30
  })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [rsvpStatus, setRsvpStatus] = useState<'yes' | 'no' | 'maybe' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize date if selectedDate is provided
  useEffect(() => {
    if (selectedDate && isOpen) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      setSelectedDateValue(dateStr)
      const timeStr = format(selectedDate, 'HH:mm')
      setStartTime(timeStr)
      const datetime = `${dateStr}T${timeStr}:00`
      setFormData(prev => ({ ...prev, start: datetime }))
    }
  }, [selectedDate, isOpen])

  // Update start datetime when date or time changes
  const updateStartDateTime = (date: string, time: string) => {
    if (date && time) {
      const datetime = `${date}T${time}:00`
      setFormData(prev => ({ ...prev, start: datetime }))
    }
  }

  // Update end datetime when time changes
  const updateEndDateTime = (date: string, time: string) => {
    if (date && time) {
      const datetime = `${date}T${time}:00`
      setFormData(prev => ({ ...prev, end: datetime }))
    }
  }

  // Handle date change
  const handleDateChange = (dateStr: string) => {
    setSelectedDateValue(dateStr)
    if (dateStr && startTime) {
      updateStartDateTime(dateStr, startTime)
    }
    if (dateStr && endTime) {
      updateEndDateTime(dateStr, endTime)
    }
  }

  // Handle start time change
  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    if (selectedDateValue && time) {
      updateStartDateTime(selectedDateValue, time)
    }
  }

  // Handle end time change
  const handleEndTimeChange = (time: string) => {
    setEndTime(time)
    if (selectedDateValue && time) {
      updateEndDateTime(selectedDateValue, time)
    }
  }

  // Load all contacts when modal opens
  useEffect(() => {
    if (isOpen && !contactsLoaded) {
      setSearchingPeople(true)
      fetch('/api/rolodex?limit=50')
        .then(res => res.ok ? res.json() : { people: [] })
        .then(data => {
          const people = data.people || []
          setAllContacts(people)
          setRolodexPeople(people)
          setContactsLoaded(true)
        })
        .catch(() => {
          setAllContacts([])
          setRolodexPeople([])
        })
        .finally(() => setSearchingPeople(false))
    }
  }, [isOpen, contactsLoaded])

  // Filter contacts based on search query
  useEffect(() => {
    if (!participantSearchOpen) {
      setParticipantSearchQuery('')
      return
    }

    if (participantSearchQuery.trim().length > 0) {
      // Filter locally from cached contacts
      const query = participantSearchQuery.toLowerCase()
      const filtered = allContacts.filter(person => 
        person.name?.toLowerCase().includes(query) ||
        person.email?.toLowerCase().includes(query)
      )
      setRolodexPeople(filtered)
    } else {
      // Show all contacts when no search query
      setRolodexPeople(allContacts)
    }
  }, [participantSearchQuery, participantSearchOpen, allContacts])

  if (!isOpen) return null

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
    const isValid = Object.keys(newErrors).length === 0
    if (!isValid) {
      console.log('[EventCreateModal] Validation errors:', newErrors)
      // Show first error as toast
      const firstError = Object.values(newErrors)[0]
      if (firstError) {
        toast.error(firstError)
      }
    }
    return isValid
  }

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

  const addParticipant = (person: RolodexPerson) => {
    const existingParticipant = participants.find(p => p.id === person.id || p.email === person.email)
    if (existingParticipant) {
      toast.info('Participant already added')
      return
    }

    const newParticipant: Participant = {
      id: person.id,
      name: person.name,
      email: person.email,
      status: 'pending',
      avatar: person.profile_photo
    }
    
    setParticipants(prev => [...prev, newParticipant])
    setFormData(prev => ({
      ...prev,
      attendees: [...prev.attendees, person.email || person.name]
    }))
    setParticipantSearchQuery('')
    setParticipantSearchOpen(false)
  }

  const removeParticipant = (id: string) => {
    const participant = participants.find(p => p.id === id)
    setParticipants(prev => prev.filter(p => p.id !== id))
    if (participant) {
      setFormData(prev => ({
        ...prev,
        attendees: prev.attendees.filter(a => a !== participant.name && a !== participant.email)
      }))
    }
  }

  // Handle location selection from MapSearch
  const handleLocationSelect = (lat: number, lng: number, name: string, type: string) => {
    setFormData(prev => ({ ...prev, location: name }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[EventCreateModal] Form submitted', { formData, user })
    
    if (!validateForm()) {
      console.log('[EventCreateModal] Validation failed', errors)
      return
    }

    if (!user) {
      toast.error('You must be logged in to create events')
      return
    }

    setLoading(true)
    console.log('[EventCreateModal] Creating event...')

    try {
      const response = await fetch('/api/calendar-events', {
        method: 'POST',
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
          organizerId: user.id,
          organizerName: user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) || user.email || 'Unknown',
          attendees: formData.attendees,
          meetingLink: formData.meetingLink,
          notificationMinutes: formData.notificationMinutes
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[EventCreateModal] API error:', response.status, errorData)
        throw new Error(errorData.error || `Failed to create event (${response.status})`)
      }

      const result = await response.json()
      toast.success('Event created successfully! It will be reviewed for approval.')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        start: '',
        end: '',
        location: '',
        type: 'meeting',
        attendees: [],
        meetingLink: '',
        meetingLinkType: 'google-meet',
        notificationMinutes: 30
      })
      setSelectedDateValue('')
      setStartTime('')
      setEndTime('')
      setParticipants([])
      setRsvpStatus(null)
      
      onEventCreated()
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-xl rounded-2xl"
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
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="text-xl font-semibold border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 mb-1"
                />
                {formData.start && (
                  <div className="text-sm text-[#4c5568] flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {getRelativeTime(formData.start)}, {formatTime(formData.start)}
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <ChevronUp className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <Calendar className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Date</Label>
              </div>
              <div className="flex-1">
                <DatePicker
                  value={selectedDateValue}
                  onChange={handleDateChange}
                  placeholder="Select date"
                />
                {errors.start && (
                  <p className="text-xs text-[#dc2625] mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.start}
                  </p>
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
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-auto"
                />
                <span className="text-[#4c5568] text-sm">to</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-auto"
                />
                {formData.start && formData.end && (
                  <span className="text-[#4c5568] text-sm">({calculateDuration()})</span>
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
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other' }))}
                >
                  <SelectTrigger className="w-full rounded-lg">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Link */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <LinkIcon className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Link</Label>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <Select 
                  value={formData.meetingLinkType} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, meetingLinkType: value }))}
                >
                  <SelectTrigger className="w-auto border-0 bg-[#f1f4f8] h-auto px-3 py-1.5 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google-meet">Google Meet</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={formData.meetingLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                  placeholder="Enter meeting link"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <MapPin className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Location</Label>
              </div>
              <div className="flex-1">
                {formData.location ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal flex-1">
                      {formData.location}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1"
                      onClick={() => setFormData(prev => ({ ...prev, location: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <MapSearch
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search for an address..."
                  />
                )}
              </div>
            </div>

            {/* Notification */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <Bell className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Notification</Label>
              </div>
              <div className="flex-1">
                <Select 
                  value={formData.notificationMinutes.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, notificationMinutes: parseInt(value) }))}
                >
                  <SelectTrigger className="w-auto border-0 bg-[#f1f4f8] h-auto px-3 py-1.5 rounded-lg">
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
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-[#4c5568]" />
                <Label className="text-sm font-medium text-[#4c5568]">Participants</Label>
              </div>
              <Popover open={participantSearchOpen} onOpenChange={setParticipantSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal rounded-lg"
                    onClick={() => setParticipantSearchOpen(true)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search Rolodex...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search people by name or email..." 
                      value={participantSearchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setParticipantSearchQuery(e.target.value)
                      }}
                    />
                    <CommandList>
                      {searchingPeople ? (
                        <div className="py-6 text-center text-sm text-[#4c5568]">
                          {participantSearchQuery.trim().length === 0 ? 'Loading contacts...' : 'Searching...'}
                        </div>
                      ) : rolodexPeople.length === 0 ? (
                        <CommandEmpty>
                          {participantSearchQuery.trim().length === 0 
                            ? 'No contacts available.' 
                            : 'No people found. Try a different search term.'}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {rolodexPeople.map((person) => (
                            <CommandItem
                              key={person.id}
                              onSelect={() => addParticipant(person)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={person.profile_photo} />
                                <AvatarFallback className="text-xs bg-[#7b95a7] text-white">
                                  {getInitials(person.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate">{person.name}</span>
                                {person.email && (
                                  <span className="text-xs text-[#4c5568] truncate">{person.email}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2 mt-2">
                {participants.map((participant) => (
                  <Badge 
                    key={participant.id} 
                    variant="secondary" 
                    className="bg-[#f1f4f8] text-[#4c5568] hover:bg-[#f1f4f8] px-3 py-1.5 text-sm font-normal flex items-center gap-2"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={participant.avatar || participant.profile_photo} />
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => removeParticipant(participant.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Description */}
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
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description"
                  rows={4}
                  className="resize-none"
                />
              )}
            </div>

            {/* RSVP Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#cfd0d5]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#4c5568]">Going?</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={rsvpStatus === 'yes' ? 'default' : 'outline'}
                    size="sm"
                    className={`rounded-lg ${rsvpStatus === 'yes' ? 'bg-[#dc2625] hover:bg-[#dc2625]/90' : ''}`}
                    onClick={() => setRsvpStatus(rsvpStatus === 'yes' ? null : 'yes')}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={rsvpStatus === 'no' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setRsvpStatus(rsvpStatus === 'no' ? null : 'no')}
                  >
                    No
                  </Button>
                  <Button
                    type="button"
                    variant={rsvpStatus === 'maybe' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setRsvpStatus(rsvpStatus === 'maybe' ? null : 'maybe')}
                  >
                    Maybe
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#dc2625] hover:bg-[#dc2625]/90 rounded-lg">
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-lg">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
