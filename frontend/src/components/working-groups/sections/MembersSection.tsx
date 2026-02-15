"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserPlus, Mail, Building, MoreVertical, Trash2, Search, User, Check, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Member {
  id: string
  person_name: string
  person_email?: string
  person_organization?: string
  contact_id?: string
  role: string
  is_active: boolean
  joined_on: string
}

interface RolodexPerson {
  id: string
  name: string
  email?: string
  profile_photo?: string
  first_name?: string
  last_name?: string
}

const ROLE_OPTIONS = [
  { value: 'chair', label: 'Chair' },
  { value: 'co_chair', label: 'Co-Chair' },
  { value: 'deputy_chair', label: 'Deputy Chair' },
  { value: 'secretariat', label: 'Secretariat' },
  { value: 'member', label: 'Member' },
  { value: 'observer', label: 'Observer' },
]

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
  return ROLE_OPTIONS.find(r => r.value === role)?.label || role
}

interface MembersSectionProps {
  workingGroupId: string
}

export default function MembersSection({ workingGroupId }: MembersSectionProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)

  // Contact search (same pattern as calendar EventCreateModal)
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [contactSearchQuery, setContactSearchQuery] = useState('')
  const [rolodexPeople, setRolodexPeople] = useState<RolodexPerson[]>([])
  const [allContacts, setAllContacts] = useState<RolodexPerson[]>([])
  const [searchingPeople, setSearchingPeople] = useState(false)
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [selectedContact, setSelectedContact] = useState<RolodexPerson | null>(null)
  const [addMode, setAddMode] = useState<'search' | 'manual'>('search')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Add member form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newOrg, setNewOrg] = useState('')
  const [newRole, setNewRole] = useState('member')
  const [newJoinedOn, setNewJoinedOn] = useState(new Date().toISOString().split('T')[0])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const fetchMembers = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }, [workingGroupId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Load all contacts when dialog opens (same as calendar)
  useEffect(() => {
    if (showAddDialog && !contactsLoaded) {
      setSearchingPeople(true)
      apiFetch('/api/rolodex?limit=50')
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
  }, [showAddDialog, contactsLoaded])

  // Auto-focus search input when popover opens
  useEffect(() => {
    if (contactSearchOpen) {
      // Small delay to let the popover render
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [contactSearchOpen])

  // Filter contacts based on search query (client-side, same as calendar)
  useEffect(() => {
    if (!contactSearchOpen) {
      setContactSearchQuery('')
      return
    }

    if (contactSearchQuery.trim().length > 0) {
      const query = contactSearchQuery.toLowerCase()
      const filtered = allContacts.filter(person =>
        person.name?.toLowerCase().includes(query) ||
        person.email?.toLowerCase().includes(query)
      )
      setRolodexPeople(filtered)
    } else {
      setRolodexPeople(allContacts)
    }
  }, [contactSearchQuery, contactSearchOpen, allContacts])

  const handleSelectContact = (person: RolodexPerson) => {
    setSelectedContact(person)
    setNewName(person.name || '')
    setNewEmail(person.email || '')
    setNewOrg('')
    setContactSearchQuery('')
    setContactSearchOpen(false)
  }

  const clearSelectedContact = () => {
    setSelectedContact(null)
    setNewName('')
    setNewEmail('')
    setNewOrg('')
    setContactSearchQuery('')
  }

  const resetForm = () => {
    setNewName('')
    setNewEmail('')
    setNewOrg('')
    setNewRole('member')
    setNewJoinedOn(new Date().toISOString().split('T')[0])
    setSelectedContact(null)
    setAddMode('search')
    setContactSearchQuery('')
    setContactSearchOpen(false)
  }

  const handleAddMember = async () => {
    if (!newName.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          person_name: newName.trim(),
          person_email: newEmail.trim() || null,
          person_organization: newOrg.trim() || null,
          role: newRole,
          joined_on: newJoinedOn,
          contact_id: selectedContact?.id || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add member')
      }

      toast.success('Member added successfully')
      setShowAddDialog(false)
      resetForm()
      fetchMembers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRoleValue: string) => {
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRoleValue }),
      })
      if (!res.ok) throw new Error('Failed to update role')
      toast.success('Role updated')
      fetchMembers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    }
  }

  const handleDeleteMember = async () => {
    if (!memberToDelete) return

    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/members/${memberToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove member')
      toast.success('Member removed')
      setMemberToDelete(null)
      fetchMembers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-20 bg-gray-100 rounded" /><div className="h-20 bg-gray-100 rounded" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Leadership & Members</h2>
          <p className="text-sm text-gray-500 mt-1">Manage working group membership and roles</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true) }} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <UserPlus className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">No members yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add members to this working group to get started</p>
          <Button onClick={() => { resetForm(); setShowAddDialog(true) }} variant="outline" className="mt-4 gap-2">
            <UserPlus className="h-4 w-4" />
            Add First Member
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Organization</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Joined</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{member.person_name}</span>
                      {!member.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.person_organization || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.person_email || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {getRoleLabel(member.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {member.joined_on ? format(new Date(member.joined_on), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ROLE_OPTIONS.map((role) => (
                          <DropdownMenuItem
                            key={role.value}
                            onClick={() => handleRoleChange(member.id, role.value)}
                            disabled={member.role === role.value}
                          >
                            Set as {role.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setMemberToDelete(member)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowAddDialog(open) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Search for an existing contact or add a new person</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={addMode === 'search' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAddMode('search'); clearSelectedContact() }}
              >
                <Search className="h-4 w-4 mr-1" />
                Search Contacts
              </Button>
              <Button
                variant={addMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAddMode('manual'); setSelectedContact(null) }}
              >
                <User className="h-4 w-4 mr-1" />
                Add New Person
              </Button>
            </div>

            {/* Contact Search — Popover + Command (same as calendar) */}
            {addMode === 'search' && !selectedContact && (
              <div className="space-y-2">
                <Label>Search existing contacts</Label>
                <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal rounded-lg"
                      onClick={() => setContactSearchOpen(true)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Search by name or email...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[460px] p-0" align="start">
                    <Command>
                      <CommandInput
                        ref={searchInputRef}
                        placeholder="Search people by name or email..."
                        value={contactSearchQuery}
                        onValueChange={(val) => setContactSearchQuery(val)}
                      />
                      <CommandList>
                        {searchingPeople ? (
                          <div className="py-6 text-center text-sm text-gray-500">
                            {contactSearchQuery.trim().length === 0 ? 'Loading contacts...' : 'Searching...'}
                          </div>
                        ) : rolodexPeople.length === 0 ? (
                          <CommandEmpty>
                            {contactSearchQuery.trim().length === 0
                              ? 'No contacts available.'
                              : 'No people found. Try a different search term.'}
                          </CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {rolodexPeople.map((person) => (
                              <CommandItem
                                key={person.id}
                                onSelect={() => handleSelectContact(person)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarImage src={person.profile_photo} />
                                  <AvatarFallback className="text-xs bg-[#7b95a7] text-white">
                                    {getInitials(person.name || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate">{person.name}</span>
                                  {person.email && (
                                    <span className="text-xs text-gray-500 truncate">{person.email}</span>
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
              </div>
            )}

            {/* Selected contact card */}
            {addMode === 'search' && selectedContact && (
              <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={selectedContact.profile_photo} />
                      <AvatarFallback className="text-sm bg-blue-200 text-blue-700">
                        {getInitials(selectedContact.name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedContact.name}
                      </p>
                      {selectedContact.email && (
                        <p className="text-xs text-gray-600">{selectedContact.email}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 hover:text-red-500"
                    onClick={clearSelectedContact}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                  <Check className="h-3 w-3" />
                  Linked to existing contact record
                </div>
              </div>
            )}

            {/* Manual name/email/org fields */}
            {addMode === 'manual' && (
              <>
                <div className="space-y-2">
                  <Label>Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Input
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    placeholder="Organization name"
                  />
                </div>
              </>
            )}

            {/* Role + Date — always shown */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Joined On</Label>
              <Input
                type="date"
                value={newJoinedOn}
                onChange={(e) => setNewJoinedOn(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false) }}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={saving || !newName.trim()}>
              {saving ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToDelete?.person_name} from this working group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-red-500 hover:bg-red-600">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
