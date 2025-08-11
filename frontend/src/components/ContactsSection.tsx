import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactTypeSearchableSelect } from "@/components/forms/ContactTypeSearchableSelect";
import { CONTACT_TYPES } from "@/data/contact-types";
import { X, Plus, Phone, Mail, Printer, User, Building } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { useContactsAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { OrganizationSearchableSelect, type Organization } from "@/components/ui/organization-searchable-select";

interface Contact {
  id?: string;
  type: string;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  organisation?: string;
  organisationId?: string;
  phone?: string;
  fax?: string;
  email?: string;
  secondaryEmail?: string;
  profilePhoto?: string;
  notes?: string;
}

interface ContactsSectionProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
  activityId?: string;
}

// Remove this as we now use the data from contact-types.ts

const TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Eng."];

// Helper function to get contact type name by code
const getContactTypeName = (code: string): string => {
  const contactType = CONTACT_TYPES.find(type => type.code === code);
  return contactType?.name || code;
};

export default function ContactsSection({ contacts, onChange, activityId }: ContactsSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const { user } = useUser();
  const [emailErrors, setEmailErrors] = useState({
    primary: "",
    secondary: ""
  });

  // Field-level autosave for contacts
  const contactsAutosave = useContactsAutosave(activityId, user?.id);

  // Fetch organizations on component mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data);
        } else {
          console.error('Failed to fetch organizations');
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Enhanced onChange that triggers autosave
  const handleContactsChange = (newContacts: Contact[]) => {
    onChange(newContacts);
    if (activityId) {
      contactsAutosave.triggerFieldSave(newContacts);
    }
  };

  // Debug onChange prop
  React.useEffect(() => {
    console.log('[CONTACTS DEBUG] ContactsSection mounted/updated');
    console.log('[CONTACTS DEBUG] Received contacts prop:', contacts);
    console.log('[CONTACTS DEBUG] Contacts array length:', contacts?.length || 0);
    console.log('[CONTACTS DEBUG] Contacts details:', JSON.stringify(contacts, null, 2));
    console.log('[CONTACTS DEBUG] onChange function exists:', !!onChange);
  }, [contacts, onChange]);

  // Email validation function
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Empty is valid (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate emails on change
  const handleEmailChange = (field: 'email' | 'secondaryEmail', value: string) => {
    const errorField = field === 'email' ? 'primary' : 'secondary';
    
    if (value && !validateEmail(value)) {
      setEmailErrors(prev => ({
        ...prev,
        [errorField]: "Please enter a valid email address"
      }));
    } else {
      setEmailErrors(prev => ({
        ...prev,
        [errorField]: ""
      }));
    }
    
    setEditingContact(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleAddContact = () => {
    console.log('[CONTACTS DEBUG] handleAddContact called');
    const newContact: Contact = {
      type: "1", // Default to "General Enquiries"
      title: "Mr.",
      firstName: "",
      lastName: "",
      position: "",
    };
    console.log('[CONTACTS DEBUG] Creating new contact form with:', newContact);
    setEditingContact(newContact);
    setEditingIndex(contacts.length);
    // Reset email errors when adding new contact
    setEmailErrors({ primary: "", secondary: "" });
  };

  const handleSaveContact = () => {
    console.log('[CONTACTS DEBUG] handleSaveContact called');
    console.log('[CONTACTS DEBUG] editingContact:', editingContact);
    
    if (!editingContact) return;

    if (!editingContact.firstName.trim() || !editingContact.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    if (!editingContact.position.trim()) {
      toast.error("Position/Role is required");
      return;
    }

    // Check for email validation errors
    if (emailErrors.primary || emailErrors.secondary) {
      toast.error("Please fix email validation errors before saving");
      return;
    }

    const updatedContacts = [...contacts];
    console.log('[CONTACTS DEBUG] Current contacts:', contacts);
    
    if (editingIndex !== null) {
      if (editingIndex === contacts.length) {
        // Adding new contact
        const newContactWithId = {
          ...editingContact,
          id: `contact-${Date.now()}`
        };
        updatedContacts.push(newContactWithId);
        console.log('[CONTACTS DEBUG] Added new contact:', newContactWithId);
        
        // Log contact addition
        try {
          import('@/lib/activity-logger').then(({ ActivityLogger }) => {
            ActivityLogger.contactAdded(
              newContactWithId,
              { id: 'current-activity', title: 'Current Activity' },
              { id: 'current-user', name: 'Current User', role: 'user' }
            );
          });
        } catch (error) {
          console.error('Failed to log contact addition:', error);
        }
      } else {
        // Updating existing contact
        updatedContacts[editingIndex] = editingContact;
        console.log('[CONTACTS DEBUG] Updated contact at index:', editingIndex);
        
        // Log contact edit (using the contactAdded method for now)
        try {
          import('@/lib/activity-logger').then(({ ActivityLogger }) => {
            ActivityLogger.contactAdded(
              editingContact,
              { id: 'current-activity', title: 'Current Activity' },
              { id: 'current-user', name: 'Current User', role: 'user' }
            );
          });
        } catch (error) {
          console.error('Failed to log contact edit:', error);
        }
      }
    }

    console.log('[CONTACTS DEBUG] Updated contacts array:', updatedContacts);
    console.log('[CONTACTS DEBUG] Calling onChange with:', updatedContacts);
    console.log('[CONTACTS DEBUG] onChange function type:', typeof onChange);
    console.log('[CONTACTS DEBUG] onChange function:', onChange);
    
    handleContactsChange(updatedContacts);
    setEditingContact(null);
    setEditingIndex(null);
    toast.success("Contact saved successfully");
  };

  const handleRemoveContact = (index: number) => {
    const contactToRemove = contacts[index];
    const updatedContacts = contacts.filter((_, i) => i !== index);
    handleContactsChange(updatedContacts);
    toast.success("Contact removed");
    
    // Log contact removal
    if (contactToRemove) {
      try {
        import('@/lib/activity-logger').then(({ ActivityLogger }) => {
          ActivityLogger.contactRemoved(
            contactToRemove,
            { id: 'current-activity', title: 'Current Activity' },
            { id: 'current-user', name: 'Current User', role: 'user' }
          );
        });
      } catch (error) {
        console.error('Failed to log contact removal:', error);
      }
    }
  };

  const handleEditContact = (index: number) => {
    setEditingContact({ ...contacts[index] });
    setEditingIndex(index);
    // Reset email errors when editing
    setEmailErrors({ primary: "", secondary: "" });
  };

  const handleCancelEdit = () => {
    setEditingContact(null);
    setEditingIndex(null);
    // Reset email errors when canceling
    setEmailErrors({ primary: "", secondary: "" });
  };

  const ProfilePhotoUpload = ({ photo, onChange }: { photo?: string; onChange: (photo: string) => void }) => {
    const onDrop = (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif"] },
      maxFiles: 1,
    });

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Profile Photo</label>
        {photo ? (
          <div className="relative w-32 h-32">
            <img
              src={photo}
              alt="Profile"
              className="w-full h-full object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isDragActive ? "border-gray-500 bg-gray-50" : "border-gray-300 hover:border-gray-400"}
              flex items-center justify-center`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <User className="h-8 w-8 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Drop photo or click</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          ACTIVITY CONTACTS
          {contactsAutosave.state.isSaving && (
            <span className="text-xs text-blue-600">Saving...</span>
          )}
          {contactsAutosave.state.lastSaved && !contactsAutosave.state.isSaving && (
            <span className="text-xs text-green-600">Saved</span>
          )}
          {contactsAutosave.state.error && (
            <span className="text-xs text-red-600">Save failed</span>
          )}
        </h2>
        <p className="text-gray-600 mt-2">
          Add contact information for key personnel involved in this activity
        </p>
      </div>

      {/* Autosave error details */}
      {contactsAutosave.state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to save contacts: {contactsAutosave.state.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Contact List */}
      <div className="space-y-4">
        {contacts.map((contact, index) => (
          (editingContact && editingIndex === index) ? null : (
          <Card key={contact.id || index}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {contact.profilePhoto ? (
                    <img
                      src={contact.profilePhoto}
                      alt={`${contact.firstName} ${contact.lastName}`}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-semibold">
                      {contact.title} {contact.firstName} {contact.middleName} {contact.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{contact.position}</p>
                    <p className="text-sm text-gray-500">{getContactTypeName(contact.type)}</p>
                    {contact.organisation && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {contact.organisation}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {contact.phone && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.fax && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Printer className="h-3 w-3" />
                          {contact.fax}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditContact(index)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveContact(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {contact.notes && (
                <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded">
                  {contact.notes}
                </p>
              )}
            </CardContent>
          </Card>
          )
        ))}

        {contacts.length === 0 && !editingContact && (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contacts added yet</p>
              <Button
                variant="outline"
                className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={handleAddContact}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Contact
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Contact Form */}
      {editingContact && (
        <Card className="border border-gray-200 shadow-none">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle>
              {editingIndex === contacts.length ? "Add New Contact" : "Edit Contact"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo at top left */}
            <div className="flex justify-start">
              <ProfilePhotoUpload
                photo={editingContact.profilePhoto}
                onChange={(photo) =>
                  setEditingContact({ ...editingContact, profilePhoto: photo })
                }
              />
            </div>

            {/* Name fields - all on one line */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className="text-sm font-medium">Title</label>
                <Select
                  value={editingContact.title}
                  onValueChange={(value) =>
                    setEditingContact({ ...editingContact, title: value })
                  }
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:ring-0 focus:border-gray-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TITLES.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={editingContact.firstName}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, firstName: e.target.value })
                  }
                  placeholder="First name"
                />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium">Middle Name</label>
                <Input
                  value={editingContact.middleName || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, middleName: e.target.value })
                  }
                  placeholder="Middle name"
                />
              </div>
              <div className="col-span-4">
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  value={editingContact.lastName}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, lastName: e.target.value })
                  }
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Position/Role - full width */}
            <div>
              <label className="text-sm font-medium">Position/Role *</label>
              <Input
                value={editingContact.position}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, position: e.target.value })
                }
                placeholder="e.g., Field Coordinator"
              />
            </div>

            {/* Contact Type - full width */}
            <div>
              <label className="text-sm font-medium">Contact Type *</label>
              <ContactTypeSearchableSelect
                value={editingContact.type}
                onValueChange={(value) =>
                  setEditingContact({ ...editingContact, type: value })
                }
                placeholder="Select contact type..."
                className="mt-1"
                dropdownId={`contact-type-select-${editingIndex}`}
              />
            </div>

            {/* Organisation - full width */}
            <div>
              <label className="text-sm font-medium">Organisation</label>
              <OrganizationSearchableSelect
                organizations={organizations}
                value={editingContact.organisationId || ""}
                onValueChange={(value) => {
                  const selectedOrg = organizations.find(org => org.id === value);
                  setEditingContact({ 
                    ...editingContact, 
                    organisationId: value,
                    organisation: selectedOrg ? selectedOrg.name : ""
                  });
                }}
                placeholder="Search organisation..."
                searchPlaceholder="Type to search organisations..."
                className="mt-1"
                disabled={loadingOrgs}
              />
            </div>

            {/* Primary Email and Secondary Email - on one line */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Primary Email</label>
                <div className="space-y-1">
                  <Input
                    type="email"
                    value={editingContact.email || ""}
                    onChange={(e) => handleEmailChange('email', e.target.value)}
                    placeholder="primary@example.org"
                    className={emailErrors.primary ? "border-red-500" : ""}
                  />
                  {emailErrors.primary && (
                    <p className="text-xs text-red-500">{emailErrors.primary}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Secondary Email</label>
                <div className="space-y-1">
                  <Input
                    type="email"
                    value={editingContact.secondaryEmail || ""}
                    onChange={(e) => handleEmailChange('secondaryEmail', e.target.value)}
                    placeholder="secondary@example.org"
                    className={emailErrors.secondary ? "border-red-500" : ""}
                  />
                  {emailErrors.secondary && (
                    <p className="text-xs text-red-500">{emailErrors.secondary}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Phone and Fax - on one line */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={editingContact.phone || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, phone: e.target.value })
                  }
                  placeholder="+95 9 123 456 789"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fax Number</label>
                <Input
                  value={editingContact.fax || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, fax: e.target.value })
                  }
                  placeholder="+95 1 234 5678"
                />
              </div>
            </div>

            {/* Notes spanning both columns */}
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editingContact.notes || ""}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, notes: e.target.value })
                }
                placeholder="Additional context or comments"
                rows={3}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={() => {
                console.log('[CONTACTS DEBUG] Save button clicked');
                handleSaveContact();
              }} className="bg-gray-900 text-white hover:bg-gray-800">
                {editingIndex === contacts.length ? "Add Contact" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Contact Button */}
      {!editingContact && contacts.length > 0 && (
        <Button onClick={handleAddContact} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Contact
        </Button>
      )}
    </div>
  );
} 