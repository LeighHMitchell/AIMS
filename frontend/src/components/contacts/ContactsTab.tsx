'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, AlertCircle, LayoutGrid, TableIcon, Pencil, Trash2, Mail, Phone, Loader2, Copy, Users } from 'lucide-react';
import ContactForm from './ContactForm';
import ContactSearchBar from './ContactSearchBar';
import { PersonCard } from '@/components/rolodex/PersonCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationLogo } from '@/components/ui/organization-logo';
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

  // Fetch contacts from database
  const fetchContacts = useCallback(async (force = false) => {
    if (!activityId) {
      console.log('[ContactsTab] No activityId, skipping fetch');
      return null;
    }

    try {
      console.log('[ContactsTab] Fetching contacts for activity:', activityId, force ? '(forced refresh)' : '');
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
      console.log('[ContactsTab] Fetched contacts:', data?.length || 0, 'contacts');
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
    
    console.log('[ContactsTab] useEffect - Checking notification conditions:', {
      hasCallback: !!onContactsChange,
      isLoading,
      contactsCount: contacts.length,
      actualContactsCount: actualContacts.length,
      lastNotifiedCount: lastNotifiedCountRef.current
    });
    
    // Only notify if:
    // 1. We have a callback
    // 2. We're not loading
    // 3. The actual contacts count has changed since last notification
    if (onContactsChange && !isLoading && lastNotifiedCountRef.current !== actualContacts.length) {
      console.log('[ContactsTab] Notifying parent with contacts:', actualContacts.length);
      lastNotifiedCountRef.current = actualContacts.length;
      onContactsChange(actualContacts);
    } else {
      console.log('[ContactsTab] NOT notifying parent - isLoading:', isLoading, 'or count unchanged');
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
      console.log('[ContactsTab] Saving', newContacts.length, 'contacts to database');
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

      console.log('[ContactsTab] Save successful, refreshing contacts list');
      console.log('[ContactsTab] Expected contacts count after save:', newContacts.length);
      
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
      console.log('[ContactsTab] Adding contact from search:', normalized);
      const updatedContacts = [...contacts, normalized];
      console.log('[ContactsTab] New contacts array length:', updatedContacts.length);
      
      await saveContacts(updatedContacts);
      console.log('[ContactsTab] Contact added successfully');
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
      console.log('[ContactsTab] Saving contact:', contact);
      let updatedContacts: Contact[];

      if (editingContact?.id) {
        // Update existing contact
        console.log('[ContactsTab] Updating existing contact:', editingContact.id);
        updatedContacts = contacts.map(c => 
          c.id === editingContact.id ? { ...contact, id: c.id } : c
        );
      } else {
        // Add new contact
        console.log('[ContactsTab] Adding new contact to', contacts.length, 'existing contacts');
        
        // Check for duplicates before adding
        const isDuplicate = contacts.some(c => areContactsDuplicate(c, contact));
        
        if (isDuplicate) {
          console.warn('[ContactsTab] Duplicate contact detected');
          toast.error('A contact with this email and name already exists');
          return;
        }

        updatedContacts = [...contacts, contact];
        console.log('[ContactsTab] New contacts array length:', updatedContacts.length);
      }

      await saveContacts(updatedContacts);
      console.log('[ContactsTab] Save complete, closing form');
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

  // Handle delete contact
  const handleDelete = async (contactId: string) => {
    if (!(await confirm({ title: 'Delete this contact?', description: 'This action cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) {
      return;
    }

    try {
      console.log('[ContactsTab] Deleting contact:', contactId);
      console.log('[ContactsTab] Current contacts count:', contacts.length);
      const updatedContacts = contacts.filter(c => c.id !== contactId);
      console.log('[ContactsTab] After filter contacts count:', updatedContacts.length);
      await saveContacts(updatedContacts);
      toast.success('Contact deleted successfully');
    } catch (error) {
      console.error('[ContactsTab] Error deleting contact:', error);
      toast.error('Failed to delete contact');
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
            <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton for contacts list */}
        <div className="bg-white p-6 rounded-lg border border-border">
          <div className="mb-4">
            <div className="h-7 bg-slate-200 rounded w-64 animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-border rounded-lg p-6 shadow-sm">
                {/* Header with avatar and actions */}
                <div className="flex items-start gap-4">
                  {/* Avatar skeleton */}
                  <div className="w-16 h-16 bg-slate-200 rounded-full animate-pulse flex-shrink-0"></div>
                  
                  {/* Name and details */}
                  <div className="flex-1 space-y-2">
                    {/* Name */}
                    <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                    {/* Job title and department */}
                    <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse"></div>
                    {/* Organization */}
                    <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                  </div>

                  {/* Action buttons skeleton */}
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                </div>

                {/* Contact info skeleton */}
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/5 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse"></div>
                </div>

                {/* Contact type badge skeleton */}
                <div className="mt-4">
                  <div className="h-6 bg-slate-200 rounded-full w-24 animate-pulse"></div>
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
          <h2 className="text-xl font-semibold mb-4">Add Contact to Activity</h2>
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
          <h2 className="text-xl font-semibold">
            Current Activity Contacts
            {isSaving && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
          </h2>
          {contacts.length > 0 && (
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
                onClick={() => setContactsView('cards')}
                className={`p-1.5 rounded transition-colors ${contactsView === 'cards' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            {/*
              Empty-state harmonized with the rest of the Stakeholders group:
              a 48px lucide icon at ~60% opacity instead of a custom image.
            */}
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" aria-hidden="true" />
            <h3 className="text-base font-medium mb-2">No contacts</h3>
            <p className="text-sm text-muted-foreground">
              {!readOnly ? 'Use the search above to add your first contact.' : 'No contacts have been added to this activity yet.'}
            </p>
          </div>
        ) : contactsView === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableRow key={contact.id || index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {contact.profilePhoto && (
                            <AvatarImage src={contact.profilePhoto} alt={fullName} />
                          )}
                          <AvatarFallback className="bg-slate-100 text-xs">
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
                            onClick={() => handleDelete(contact.id || '')}
                            className="p-1.5 rounded hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                            title="Remove contact"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

