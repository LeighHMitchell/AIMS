'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import ContactCard from './ContactCard';
import ContactForm from './ContactForm';
import ContactSearchBar from './ContactSearchBar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { normalizeContact, deduplicateContacts, areContactsDuplicate } from '@/lib/contact-utils';

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      const response = await fetch(`/api/activities/${activityId}/contacts?_t=${timestamp}&_force=${force}`, {
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
      
      const response = await fetch('/api/activities/field', {
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
    if (!confirm('Are you sure you want to delete this contact?')) {
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


  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for search/add bar */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="space-y-4">
            <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton for contacts list */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="mb-4">
            <div className="h-7 bg-slate-200 rounded w-64 animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
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
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Add Contact to Activity</h2>
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
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Current Activity Contacts
          </h2>
        </div>

        {contacts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No contacts added yet. {!readOnly && 'Search for existing contacts or create a new one above.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contacts.map((contact, index) => (
              <ContactCard
                key={contact.id || index}
                contact={contact}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-700">Saving contacts...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

