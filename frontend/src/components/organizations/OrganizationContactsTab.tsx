'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, AlertCircle, Search, X, User as UserIcon, Mail, Phone, Globe, Edit2, Trash2, Upload, ChevronsUpDown, Check, LayoutGrid, List } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { validateIatiContactType } from '@/lib/contact-utils';
import { CountryCodeSearchableSelect } from '@/components/forms/CountryCodeSearchableSelect';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Contact {
  id?: string;
  type: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  jobTitle?: string;
  department?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  countryCode?: string;
  website?: string;
  mailingAddress?: string;
  profilePhoto?: string;
  notes?: string;
  isPrimary?: boolean;
  displayOrder?: number;
  linkedUserId?: string;
  linkedUser?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  } | null;
}

interface OrgUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  telephone?: string;
  contact_type?: string;
}

interface OrganizationInfo {
  name: string;
  acronym?: string;
  logo?: string;
}

interface OrganizationContactsTabProps {
  organizationId: string;
  organization?: OrganizationInfo;
}

export default function OrganizationContactsTab({ organizationId, organization }: OrganizationContactsTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const { settings } = useSystemSettings();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowUserSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch contacts from database
  const fetchContacts = useCallback(async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/organizations/${organizationId}/contacts`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data || []);
    } catch (error) {
      console.error('[OrgContactsTab] Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Fetch users from the same organization
  const fetchOrgUsers = useCallback(async () => {
    if (!organizationId) return;

    try {
      const response = await fetch(`/api/organizations/${organizationId}/users`);
      if (response.ok) {
        const data = await response.json();
        setOrgUsers(data || []);
      }
    } catch (error) {
      console.error('[OrgContactsTab] Error fetching org users:', error);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchContacts();
    fetchOrgUsers();
  }, [fetchContacts, fetchOrgUsers]);

  // Handle user selection from search - directly add as contact
  const handleSelectUser = async (user: OrgUser) => {
    // Check if this user is already a contact
    const existingContact = contacts.find(c => c.linkedUserId === user.id);
    if (existingContact) {
      toast.error('This user is already added as a contact');
      return;
    }

    // Parse full name into first and last name
    const nameParts = user.full_name?.split(' ') || [''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Directly create the contact without showing the form
    const newContact: Contact = {
      type: user.contact_type || '1', // Use user's contact type or default to General Enquiries
      firstName,
      lastName,
      email: user.email,
      jobTitle: user.job_title,
      department: user.department,
      phone: user.telephone,
      profilePhoto: user.avatar_url,
      linkedUserId: user.id,
    };

    setShowUserSearch(false);
    setSearchQuery('');

    // Save the contact directly
    await handleSave(newContact);
  };

  // Handle create new contact
  const handleCreateNew = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  // Handle save contact
  const handleSave = async (contact: Contact) => {
    if (!organizationId) return;

    try {
      setIsSaving(true);

      if (editingContact?.id) {
        // Update existing contact
        const response = await fetch(`/api/organizations/${organizationId}/contacts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...contact, id: editingContact.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to update contact');
        }

        toast.success('Contact updated successfully');
      } else {
        // Create new contact
        const response = await fetch(`/api/organizations/${organizationId}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
        });

        if (!response.ok) {
          throw new Error('Failed to create contact');
        }

        toast.success('Contact added successfully');
      }

      await fetchContacts();
      setShowForm(false);
      setEditingContact(null);
    } catch (error) {
      console.error('[OrgContactsTab] Error saving contact:', error);
      toast.error('Failed to save contact');
    } finally {
      setIsSaving(false);
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
      const response = await fetch(`/api/organizations/${organizationId}/contacts?contactId=${contactId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      toast.success('Contact deleted successfully');
      await fetchContacts();
    } catch (error) {
      console.error('[OrgContactsTab] Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  // Handle cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingContact(null);
  };

  // Filter users based on search query (show all if query is empty)
  const filteredUsers = orgUsers.filter(user => {
    if (!searchQuery.trim()) return true; // Show all users when no search query
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="space-y-4">
            <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse"></div>
                  </div>
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
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Add Contact to Organization Profile</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add contacts that will be displayed on your public organization profile page. You can search for existing users in your organization or create new contact records.
        </p>

        {/* User Search */}
        <div className="relative mb-4" ref={searchContainerRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowUserSearch(true);
              }}
              onFocus={() => setShowUserSearch(true)}
              placeholder="Search users in your organization..."
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowUserSearch(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showUserSearch && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  {searchQuery ? `No users found matching "${searchQuery}"` : 'No users found in your organization'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <UserAvatar
                      src={user.avatar_url}
                      seed={user.email || user.id}
                      name={user.full_name}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      {user.job_title && (
                        <p className="text-xs text-gray-400 truncate">{user.job_title}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Or</span>
          <Button onClick={handleCreateNew} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create New Contact
          </Button>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showForm && (
        <ContactFormDialog
          contact={editingContact}
          onSave={handleSave}
          onCancel={handleCancel}
          isOpen={showForm}
          isSaving={isSaving}
          settings={settings}
        />
      )}

      {/* Current Contacts List */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              Organization Contacts
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              These contacts will be displayed on your public organization profile page.
            </p>
          </div>
          {contacts.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === 'card'
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                )}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === 'table'
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                )}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {contacts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No contacts added yet. Search for existing users or create a new contact above.
            </AlertDescription>
          </Alert>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                organization={organization}
              />
            ))}
          </div>
        ) : (
          <ContactsTable
            contacts={contacts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            organization={organization}
          />
        )}
      </div>

      {/* Loading overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-700">Saving contact...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Contact Card Component
function ContactCard({
  contact,
  onEdit,
  onDelete,
  organization
}: {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  organization?: OrganizationInfo;
}) {
  const typeInfo = validateIatiContactType(contact.type);
  const fullName = `${contact.title ? contact.title + ' ' : ''}${contact.firstName} ${contact.lastName}`.trim();
  const jobLine = [contact.jobTitle, contact.department].filter(Boolean).join(' • ');

  return (
    <div className="relative border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white">
      {/* Primary badge */}
      {contact.isPrimary && (
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Primary Contact
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(contact)}
          className="h-8 w-8 p-0 hover:bg-slate-100 rounded-md"
          title="Edit contact"
        >
          <Edit2 className="h-4 w-4 text-slate-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => contact.id && onDelete(contact.id)}
          className="h-8 w-8 p-0 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-md"
          title="Delete contact"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className={cn("flex items-start gap-4", contact.isPrimary && "mt-6")}>
        <UserAvatar
          src={contact.profilePhoto}
          seed={contact.email || contact.linkedUserId || fullName}
          name={fullName}
          size={64}
        />

        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-lg font-semibold text-slate-900 leading-tight break-words">
            {fullName}
            {contact.linkedUser && (
              <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Linked User
              </span>
            )}
          </h3>

          {jobLine && (
            <p className="text-sm text-slate-600 break-words">{jobLine}</p>
          )}

          {organization && (
            <div className="flex items-center gap-2 mt-1">
              {organization.logo ? (
                <img
                  src={organization.logo}
                  alt={organization.name}
                  className="w-5 h-5 object-contain rounded"
                />
              ) : (
                <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center">
                  <span className="text-[10px] font-medium text-slate-500">
                    {organization.acronym?.charAt(0) || organization.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-sm text-slate-500">
                {organization.name}
                {organization.acronym && ` (${organization.acronym})`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {contact.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <a
              href={`mailto:${contact.email}`}
              className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
            >
              {contact.email}
            </a>
          </div>
        )}

        {(contact.phone || contact.phoneNumber) && (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-700">
              {contact.countryCode ? `${contact.countryCode} ` : ''}{contact.phoneNumber || contact.phone}
            </span>
          </div>
        )}

        {contact.website && (
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
            >
              {contact.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      <div className="mt-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {typeInfo.label}
        </span>
      </div>
    </div>
  );
}

// Contacts Table Component
function ContactsTable({
  contacts,
  onEdit,
  onDelete,
  organization
}: {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  organization?: OrganizationInfo;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Contact</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Role</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Organization</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Email</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Phone</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Type</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => {
            const typeInfo = validateIatiContactType(contact.type);
            const fullName = `${contact.title ? contact.title + ' ' : ''}${contact.firstName} ${contact.lastName}`.trim();
            const jobLine = [contact.jobTitle, contact.department].filter(Boolean).join(' • ');

            return (
              <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={contact.profilePhoto}
                      seed={contact.email || contact.linkedUserId || fullName}
                      name={fullName}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{fullName}</p>
                      {contact.isPrimary && (
                        <span className="text-xs text-blue-600">Primary Contact</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-slate-700">{jobLine || '—'}</p>
                </td>
                <td className="py-3 px-4">
                  {organization ? (
                    <div className="flex items-center gap-2">
                      {organization.logo ? (
                        <img
                          src={organization.logo}
                          alt={organization.name}
                          className="w-5 h-5 object-contain rounded"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center">
                          <span className="text-[10px] font-medium text-slate-500">
                            {organization.acronym?.charAt(0) || organization.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-slate-600">
                        {organization.acronym || organization.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-sm text-slate-700 hover:text-blue-600"
                    >
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-700">
                    {contact.phone || contact.phoneNumber
                      ? `${contact.countryCode ? contact.countryCode + ' ' : ''}${contact.phoneNumber || contact.phone}`
                      : '—'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {typeInfo.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(contact)}
                      className="h-8 w-8 p-0 hover:bg-slate-100"
                      title="Edit contact"
                    >
                      <Edit2 className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => contact.id && onDelete(contact.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 text-red-500 hover:text-red-600"
                      title="Delete contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Contact Form Dialog Component
function ContactFormDialog({
  contact,
  onSave,
  onCancel,
  isOpen,
  isSaving,
  settings,
}: {
  contact: Contact | null;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
  isOpen: boolean;
  isSaving: boolean;
  settings: any;
}) {
  const [formData, setFormData] = useState<Contact>({
    type: '1',
    firstName: '',
    lastName: '',
    jobTitle: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contactTypeOpen, setContactTypeOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load contact data when editing
  useEffect(() => {
    if (contact) {
      setFormData({
        ...contact,
        countryCode: contact.countryCode,
      });
    } else {
      // Reset form and prefill country code from settings
      setFormData({
        type: '1',
        firstName: '',
        lastName: '',
        jobTitle: '',
        countryCode: settings?.homeCountryData?.dialCode || '',
      });
    }
  }, [contact, settings]);

  const handleChange = (field: keyof Contact, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.type) {
      newErrors.type = 'Contact type is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  // Profile photo upload handlers
  const handlePhotoUpload = useCallback((file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, profilePhoto: 'Please upload a valid image file' }));
      toast.error('Please upload a valid image file');
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, profilePhoto: 'Image size must be less than 2MB' }));
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, profilePhoto: base64String }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.profilePhoto;
        return newErrors;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  }, [handlePhotoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePhotoUpload(e.target.files[0]);
    }
  }, [handlePhotoUpload]);

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, profilePhoto: undefined }));
  };

  const contactTypes = [
    { value: '1', label: 'General Enquiries', description: 'General inquiries and information requests' },
    { value: '2', label: 'Project Management', description: 'Project coordination and management contacts' },
    { value: '3', label: 'Financial Management', description: 'Financial reporting and budget management' },
    { value: '4', label: 'Communications', description: 'Public relations and communications' },
  ];

  const titles = [
    { value: 'Mr.', label: 'Mr.' },
    { value: 'Ms.', label: 'Ms.' },
    { value: 'Mrs.', label: 'Mrs.' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Prof.', label: 'Prof.' },
  ];

  const selectedContactType = contactTypes.find(type => type.value === formData.type);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {contact?.id ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {contact?.id
              ? 'Update the contact information.'
              : 'Add a new contact to display on your organization profile.'}
          </DialogDescription>
        </DialogHeader>

        <form id="org-contact-form" onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Profile Photo Upload */}
          <div>
            <Label>Profile Photo</Label>
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "relative w-24 h-24 rounded-full border-2 border-dashed transition-all cursor-pointer",
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                  formData.profilePhoto && "border-solid border-gray-200"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.profilePhoto ? (
                  <>
                    <img
                      src={formData.profilePhoto}
                      alt="Profile preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto();
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-full">
                    <UserIcon className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {formData.profilePhoto ? 'Change Photo' : 'Upload Photo'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Drag & drop or click to upload<br />Max 2MB
              </p>
              {errors.profilePhoto && (
                <p className="text-xs text-red-500 text-center">{errors.profilePhoto}</p>
              )}
            </div>
          </div>

          {/* Contact Type */}
          <div>
            <Label htmlFor="type">
              Contact Type <span className="text-red-500">*</span>
            </Label>
            <Popover open={contactTypeOpen} onOpenChange={setContactTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={contactTypeOpen}
                  className={cn(
                    "w-full justify-between h-10 px-3 py-2 text-sm",
                    !selectedContactType && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {selectedContactType ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedContactType.value}</span>
                        <span className="font-medium">{selectedContactType.label}</span>
                      </span>
                    ) : (
                      "Select contact type..."
                    )}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border">
                <Command>
                  <CommandList>
                    {contactTypes.map((type) => (
                      <CommandItem
                        key={type.value}
                        onSelect={() => {
                          handleChange('type', type.value);
                          setContactTypeOpen(false);
                        }}
                        className="cursor-pointer py-3 hover:bg-accent/50"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.type === type.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type.value}</span>
                            <span className="font-medium text-foreground">{type.label}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
          </div>

          {/* Name Row */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title</Label>
              <Select
                value={formData.title || '__none__'}
                onValueChange={(value) => handleChange('title', value === '__none__' ? undefined : value)}
              >
                <SelectTrigger id="title">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {titles.map(title => (
                    <SelectItem key={title.value} value={title.value}>
                      {title.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-5">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
              />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>

            <div className="col-span-5">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Smith"
              />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Primary Contact Checkbox */}
          <div className="flex items-center space-x-2 -mt-2">
            <Checkbox
              id="isPrimary"
              checked={formData.isPrimary || false}
              onCheckedChange={(checked) => handleChange('isPrimary', checked)}
            />
            <Label htmlFor="isPrimary" className="cursor-pointer text-sm">
              This is the primary contact for the organization
            </Label>
          </div>

          {/* Job Title and Department Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle || ''}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                placeholder="e.g., Country Director"
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department || ''}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="e.g., Operations, Finance"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john.smith@example.org"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Phone Number with Country Code */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <Label htmlFor="countryCode">Country Code</Label>
              <CountryCodeSearchableSelect
                value={formData.countryCode || ''}
                onValueChange={(value) => handleChange('countryCode', value)}
                placeholder="Select code"
                dropdownId="org-contact-country-code"
              />
            </div>
            <div className="col-span-8">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                placeholder="123456789"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://example.org"
            />
            {errors.website && <p className="text-xs text-red-500 mt-1">{errors.website}</p>}
          </div>

          {/* Mailing Address */}
          <div>
            <Label htmlFor="mailingAddress">Mailing Address</Label>
            <textarea
              id="mailingAddress"
              value={formData.mailingAddress || ''}
              onChange={(e) => handleChange('mailingAddress', e.target.value)}
              placeholder="Street address, city, postal code"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this contact..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="org-contact-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : contact?.id ? 'Update Contact' : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
