'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, AlertCircle, LayoutGrid, TableIcon, Pencil, Trash2, Mail, Phone, Loader2, Copy, Users, CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import ContactForm from './ContactForm';
import ContactSearchBar from './ContactSearchBar';
import { PersonCard } from '@/components/rolodex/PersonCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationLogo } from '@/components/ui/organization-logo';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { toast } from 'sonner';
import { normalizeContact, deduplicateContacts, areContactsDuplicate } from '@/lib/contact-utils';
import { apiFetch } from '@/lib/api-fetch';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { RolodexPerson } from '@/app/api/rolodex/route';

interface Contact {
  id?: string;
  type: string;
  title?: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  position?: string; // Keep for backward compatibility
  department?: string;
  organisation?: string;
  organisationId?: string;
  organisationAcronym?: string;
  organisationLogo?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  countryCode?: string;
  website?: string;
  mailingAddress?: string;
  profilePhoto?: string;
  isFocalPoint?: boolean;
  importedFromIati?: boolean;
}

interface SearchResult {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  organisation?: string;
  organisationId?: string;
  organisationAcronym?: string;
  position?: string;
  jobTitle?: string;
  department?: string;
  type?: string;
  profilePhoto?: string;
  source: 'contact';
  label: string;
}

interface ContactsTabProps {
  activityId: string;
  readOnly?: boolean;
  onContactsChange?: (contacts: Contact[]) => void;
}

export default function ContactsTab({ activityId, readOnly = false, onContactsChange }: ContactsTabProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contactsView, setContactsView] = useState<'table' | 'cards'>('table');
  const saveInProgressRef = useRef(false);
  const lastNotifiedCountRef = useRef<number>(-1);
  // Bulk-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const toggleContactSelected = (id: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const exitContactSelectMode = () => {
    setSelectMode(false);
    setSelectedContactIds(new Set());
  };

  // Fetch contacts from database
  const fetchContacts = useCallback(async (force = false) => {
    if (!activityId) {
      return null;
    }

    try {
      if (force || isLoading) {
        setIsLoading(true);
      }
      // Add cache-busting timestamp to prevent stale responses
      const timestamp = Date.now();
      const response = await apiFetch(`/api/activities/${activityId}/contacts?_t=${timestamp}&_force=${force}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        console.error('[ContactsTab] Fetch failed with status:', response.status);
        throw new Error('Failed to fetch contacts');
      }
      
      const data = await response.json();
      setContacts(data || []);
      return data || [];
    } catch (error) {
      console.error('[ContactsTab] Error fetching contacts:', error);
      toast.error('Failed to load contacts');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchContacts(false);
  }, [activityId]);

  // Notify parent when contacts change (for green tick updates)
  // Only notify after initial data load is complete to prevent green tick from disappearing
  useEffect(() => {
    // Filter out contacts without IDs - only count actual saved contacts
    const actualContacts = contacts.filter(c => c.id);

    // Only notify if:
    // 1. We have a callback
    // 2. We're not loading
    // 3. The actual contacts count has changed since last notification
    if (onContactsChange && !isLoading && lastNotifiedCountRef.current !== actualContacts.length) {
      lastNotifiedCountRef.current = actualContacts.length;
      onContactsChange(actualContacts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, isLoading]); // Intentionally exclude onContactsChange to prevent infinite loops

  // Save contacts to database
  const saveContacts = async (newContacts: Contact[]) => {
    if (!activityId) {
      console.error('[ContactsTab] Cannot save - no activityId');
      return;
    }

    // Prevent duplicate saves
    if (saveInProgressRef.current) {
      console.warn('[ContactsTab] Save already in progress, ignoring duplicate request');
      return;
    }

    try {
      saveInProgressRef.current = true;
      setIsSaving(true);
      
      const response = await apiFetch('/api/activities/field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          field: 'contacts',
          value: newContacts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ContactsTab] Save failed:', errorData);
        throw new Error('Failed to save contacts');
      }

      
      // Delay to ensure database transaction commits and propagates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Force refresh contacts from database with cache busting
      const fetchedContacts = await fetchContacts(true);
      
      // Verify the count matches what we expect
      if (fetchedContacts && fetchedContacts.length !== newContacts.length) {
        console.warn('[ContactsTab] ⚠️ Contact count mismatch! Expected:', newContacts.length, 'Got:', fetchedContacts.length);
        toast.warning(`Contacts may not have synced correctly. Expected ${newContacts.length}, got ${fetchedContacts.length}. Try refreshing.`);
      } else {
        toast.success('Contacts updated successfully');
      }
    } catch (error) {
      console.error('[ContactsTab] Error saving contacts:', error);
      toast.error('Failed to save contacts');
      throw error; // Re-throw to allow caller to handle
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  };

  // Handle search result selection
  const handleSearchSelect = async (result: SearchResult) => {
    const normalized = normalizeContact(result, result.source);
    
    // Check for duplicates
    const isDuplicate = contacts.some(c => areContactsDuplicate(c, normalized));
    
    if (isDuplicate) {
      toast.error('This contact already exists for this activity');
      return;
    }

    // Add contact directly without showing form
    try {
      const updatedContacts = [...contacts, normalized];
      
      await saveContacts(updatedContacts);
    } catch (error) {
      console.error('[ContactsTab] Error adding contact from search:', error);
      // Error handled by saveContacts
    }
  };

  // Handle create new contact
  const handleCreateNew = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  // Handle form save
  const handleSave = async (contact: Contact) => {
    try {
      let updatedContacts: Contact[];

      if (editingContact?.id) {
        // Update existing contact
        updatedContacts = contacts.map(c => 
          c.id === editingContact.id ? { ...contact, id: c.id } : c
        );
      } else {
        // Add new contact
        
        // Check for duplicates before adding
        const isDuplicate = contacts.some(c => areContactsDuplicate(c, contact));
        
        if (isDuplicate) {
          console.warn('[ContactsTab] Duplicate contact detected');
          toast.error('A contact with this email and name already exists');
          return;
        }

        updatedContacts = [...contacts, contact];
      }

      await saveContacts(updatedContacts);
      setShowForm(false);
      setEditingContact(null);
    } catch (error) {
      console.error('[ContactsTab] Error in handleSave:', error);
      // Error handled by saveContacts
    }
  };

  // Handle edit contact
  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  // Bulk remove selected contacts
  const handleBulkDelete = async () => {
    if (selectedContactIds.size === 0) return;
    const count = selectedContactIds.size;
    if (!(await confirm({
      title: `Remove ${count} contact${count === 1 ? '' : 's'}?`,
      description: `The selected contact${count === 1 ? '' : 's'} will be removed from this activity. You'll have a moment to undo.`,
      confirmLabel: `Remove ${count}`,
      cancelLabel: 'Keep all',
    }))) return;

    try {
      const previousContacts = contacts;
      const updatedContacts = contacts.filter(c => !selectedContactIds.has(c.id || ''));
      await saveContacts(updatedContacts);
      exitContactSelectMode();
      toast.success(`Removed ${count} contact${count === 1 ? '' : 's'}`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await saveContacts(previousContacts);
              toast.success('Contacts restored');
            } catch {
              toast.error("Couldn't restore the contacts. Please add them again manually.");
            }
          },
        },
      });
    } catch {
      toast.error("Couldn't remove the contacts. Please try again in a moment.");
    }
  };

  // Handle delete contact
  const handleDelete = async (contactId: string) => {
    const snapshot = contacts.find(c => c.id === contactId);
    const contactName = snapshot
      ? `${snapshot.firstName || ''} ${snapshot.lastName || ''}`.trim() || 'this contact'
      : 'this contact';
    if (!(await confirm({
      title: 'Remove this contact?',
      description: `"${contactName}" will be removed from this activity. You'll have a moment to undo.`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      destructive: true,
    }))) {
      return;
    }

    try {
      const previousContacts = contacts;
      const updatedContacts = contacts.filter(c => c.id !== contactId);
      await saveContacts(updatedContacts);
      toast.success(`Removed ${contactName}`, snapshot ? {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await saveContacts(previousContacts);
              toast.success('Contact restored');
            } catch {
              toast.error("Couldn't restore the contact. Please add it again manually.");
            }
          },
        },
      } : undefined);
    } catch (error) {
      console.error('[ContactsTab] Error deleting contact:', error);
      toast.error("Couldn't remove the contact. Please try again in a moment.");
    }
  };

  // Handle cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingContact(null);
  };

  // Convert Contact to RolodexPerson for PersonCard
  const toRolodexPerson = (contact: Contact): RolodexPerson => ({
    id: contact.id || '',
    source: 'activity_contact',
    name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown Contact',
    title: contact.title,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email || '',
    position: contact.jobTitle || contact.position,
    job_title: contact.jobTitle || contact.position,
    department: contact.department,
    organization_id: contact.organisationId,
    organization_name: contact.organisation,
    organization_acronym: contact.organisationAcronym,
    organization_logo: contact.organisationLogo,
    phone: contact.phoneNumber || contact.phone,
    country_code: contact.countryCode,
    profile_photo: contact.profilePhoto,
    created_at: '',
    updated_at: '',
    activity_count: 0,
  });


  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for search/add bar */}
        <div className="bg-white p-6 rounded-lg border border-border">
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton for contacts list */}
        <div className="bg-white p-6 rounded-lg border border-border">
          <div className="mb-4">
            <div className="h-7 bg-muted rounded w-64 animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-border rounded-lg p-6 shadow-sm">
                {/* Header with avatar and actions */}
                <div className="flex items-start gap-4">
                  {/* Avatar skeleton */}
                  <div className="w-16 h-16 bg-muted rounded-full animate-pulse flex-shrink-0"></div>
                  
                  {/* Name and details */}
                  <div className="flex-1 space-y-2">
                    {/* Name */}
                    <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
                    {/* Job title and department */}
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
                    {/* Organization */}
                    <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                  </div>

                  {/* Action buttons skeleton */}
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>

                {/* Contact info skeleton */}
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-3/5 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
                </div>

                {/* Contact type badge skeleton */}
                <div className="mt-4">
                  <div className="h-6 bg-muted rounded-full w-24 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Add Section */}
      {!readOnly && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Add Contact to Activity</h2>
            <HelpTextTooltip content="Search for an existing contact across the system to link them to this activity. If they're new, click 'Create New' to add them. Contacts are general points-of-contact; the Focal Points tab manages officially-designated roles." />
          </div>
          <ContactSearchBar
            onSelect={handleSearchSelect}
            onCreateNew={handleCreateNew}
          />
        </div>
      )}

      {/* Contact Form Modal */}
      {showForm && !readOnly && (
        <ContactForm
          contact={editingContact}
          onSave={handleSave}
          onCancel={handleCancel}
          isOpen={showForm}
        />
      )}

      {/* Current Contacts List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              Current Activity Contacts
              {isSaving && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
            </h2>
            <HelpTextTooltip content="People linked to this specific activity for questions, documentation, or coordination. Duplicate detection prevents adding the same person twice." />
          </div>
          {contacts.length > 0 && (
            <div className="flex items-center gap-2">
              {!readOnly && contactsView === 'table' && (
                selectMode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedContactIds.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={selectedContactIds.size === 0}
                    >
                      Remove selected
                    </Button>
                    <Button size="sm" variant="ghost" onClick={exitContactSelectMode}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectMode(true)}
                    className="gap-1.5"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Select
                  </Button>
                )
              )}
              <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setContactsView('table')}
                  className={`p-1.5 rounded transition-colors ${contactsView === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Table view"
                >
                  <TableIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setContactsView('cards'); exitContactSelectMode(); }}
                  className={`p-1.5 rounded transition-colors ${contactsView === 'cards' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            <img src="/images/empty-cardholder.webp" alt="No contacts" className="h-32 mx-auto mb-4 opacity-50" />
            <h3 className="text-base font-medium mb-2">No contacts</h3>
            <p className="text-sm text-muted-foreground">
              {!readOnly ? 'Use the search above to add your first contact.' : 'No contacts have been added to this activity yet.'}
            </p>
          </div>
        ) : contactsView === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow>
                {selectMode && (
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        contacts.length > 0 &&
                        contacts.every(c => selectedContactIds.has(c.id || ''))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedContactIds(new Set(contacts.map(c => c.id || '').filter(Boolean)));
                        } else {
                          setSelectedContactIds(new Set());
                        }
                      }}
                      aria-label="Select all contacts"
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Email</TableHead>
                {!readOnly && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact, index) => {
                const fullName = [contact.title, contact.firstName, contact.lastName].filter(Boolean).join(' ');
                const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();
                const orgDisplay = contact.organisationAcronym
                  ? `${contact.organisation} (${contact.organisationAcronym})`
                  : contact.organisation;

                return (
                  <TableRow
                    key={contact.id || index}
                    className={cn(
                      selectMode && "cursor-pointer",
                      selectMode && selectedContactIds.has(contact.id || '') && "bg-muted/50"
                    )}
                    onClick={selectMode ? () => toggleContactSelected(contact.id || '') : undefined}
                  >
                    {selectMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedContactIds.has(contact.id || '')}
                          onCheckedChange={() => toggleContactSelected(contact.id || '')}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${[contact.firstName, contact.lastName].filter(Boolean).join(' ')}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {contact.profilePhoto && (
                            <AvatarImage src={contact.profilePhoto} alt={fullName} />
                          )}
                          <AvatarFallback className="bg-muted text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{fullName || 'Unknown Contact'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {contact.jobTitle || contact.position || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {orgDisplay ? (
                        <div className="flex items-center gap-2">
                          <OrganizationLogo
                            logo={contact.organisationLogo}
                            name={orgDisplay}
                            size="sm"
                          />
                          <span>{orgDisplay}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {contact.email ? (
                        <div className="flex items-center gap-1 group/email">
                          <span>{contact.email}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(contact.email!);
                              toast.success('Email copied');
                            }}
                            className="p-1 rounded hover:bg-muted opacity-0 group-hover/email:opacity-100 transition-opacity"
                            title="Copy email"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      ) : '-'}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(contact.id || ''); }}
                            disabled={selectMode}
                            className="p-1.5 rounded hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
                            title="Remove contact"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contacts.map((contact, index) => {
              const person = toRolodexPerson(contact);
              return (
                <PersonCard
                  key={contact.id || index}
                  person={person}
                  onDelete={(p) => handleDelete(p.id)}
                />
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
}

