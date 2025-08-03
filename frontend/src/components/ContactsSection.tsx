import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Phone, Mail, Printer, User, Building, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { useContactsAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { OrganizationCombobox, Organization } from '@/components/ui/organization-combobox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Contact {
  id?: string;
  type: string;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  organisationId?: string; // Changed to ID for combobox
  organisationName?: string; // Keep name for display/fallback
  phone?: string;
  fax?: string;
  primaryEmail?: string;
  secondaryEmail?: string;
  profilePhoto?: string;
  notes?: string;
}

interface ContactsSectionProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
  activityId?: string;
  createdByOrgId?: string; // Organization that created the activity
  organizations?: Organization[]; // Available organizations for combobox
}

const CONTACT_TYPES = [
  { code: "implementing_partner", name: "Implementing Partner", description: "Key personnel directly implementing activities" },
  { code: "funding_agency", name: "Funding Agency", description: "Representatives from funding organizations" },
  { code: "government_liaison", name: "Government Liaison", description: "Government officials and partners" },
  { code: "technical_advisor", name: "Technical Advisor", description: "Subject matter experts and advisors" },
  { code: "field_coordinator", name: "Field Coordinator", description: "On-site coordinators and field staff" },
  { code: "me_officer", name: "M&E Officer", description: "Monitoring and evaluation specialists" },
  { code: "other", name: "Other", description: "Other contact types not listed above" }
];

const TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Eng."];

// Helper function to migrate old contact type values to new codes
function migrateContactType(oldValue: string | undefined | null): string {
  const migrationMap: Record<string, string> = {
    'Implementing Partner': 'implementing_partner',
    'Funding Agency': 'funding_agency', 
    'Government Liaison': 'government_liaison',
    'Technical Advisor': 'technical_advisor',
    'Field Coordinator': 'field_coordinator',
    'M&E Officer': 'me_officer',
    'Other': 'other'
  };
  
  if (!oldValue) return 'implementing_partner'; // Default
  
  // If it's already a valid code, return it
  if (CONTACT_TYPES.some(type => type.code === oldValue)) {
    return oldValue;
  }
  
  // Otherwise, try to migrate from old format
  return migrationMap[oldValue] || 'implementing_partner';
}

// Contact Type Select Component matching Collaboration Type style
function ContactTypeSelect({
  value,
  onValueChange,
  placeholder = "Select contact type...",
  disabled = false,
  className,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  
  // Migrate the value if it's in old format
  const migratedValue = value ? migrateContactType(value) : '';
  const selectedOption = CONTACT_TYPES.find(type => type.code === migratedValue);

  return (
    <div className={cn("", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedOption && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{selectedOption.name}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedOption && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
              >
                <span className="text-xs">×</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandList>
              <CommandGroup>
                {CONTACT_TYPES.map((option) => (
                  <CommandItem
                    key={option.code}
                    onSelect={() => {
                      onValueChange(option.code);
                      setOpen(false);
                    }}
                    className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        migratedValue === option.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{option.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {option.description}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function ContactsSection({ 
  contacts, 
  onChange, 
  activityId,
  createdByOrgId,
  organizations = []
}: ContactsSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { user } = useUser();

  // Field-level autosave for contacts
  const contactsAutosave = useContactsAutosave(activityId, user?.id);

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

  const handleAddContact = () => {
    console.log('[CONTACTS DEBUG] handleAddContact called');
    const newContact: Contact = {
      type: "implementing_partner",
      title: "Mr.",
      firstName: "",
      lastName: "",
      position: "",
      organisationId: createdByOrgId || "", // Prefill with activity creator org
      primaryEmail: "",
      secondaryEmail: "",
    };
    console.log('[CONTACTS DEBUG] Creating new contact form with:', newContact);
    setEditingContact(newContact);
    setEditingIndex(contacts.length);
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
  };

  const handleCancelEdit = () => {
    setEditingContact(null);
    setEditingIndex(null);
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
      <div className="w-full h-full">
        {photo ? (
          <div className="relative w-full h-full">
            <img
              src={photo}
              alt="Profile"
              className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`w-full h-full border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
              flex items-center justify-center`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <User className="h-6 w-6 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500 px-1">Click or drop</p>
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
                    <p className="text-sm text-gray-500">
                      {CONTACT_TYPES.find(type => type.code === migrateContactType(contact.type))?.name || contact.type}
                    </p>
                    {(contact.organisationId || contact.organisationName) && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {organizations.find(org => org.id === contact.organisationId)?.name || contact.organisationName}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {contact.phone && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.primaryEmail && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.primaryEmail}
                        </span>
                      )}
                      {contact.secondaryEmail && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.secondaryEmail}
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
        ))}

        {contacts.length === 0 && !editingContact && (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contacts added yet</p>
              <Button
                variant="outline"
                className="mt-4"
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
        <Card>
          <CardHeader>
            <CardTitle>
              {editingIndex === contacts.length ? "Add New Contact" : "Edit Contact"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo - Top Right */}
            <div className="flex justify-end">
              <div className="text-center">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Profile Photo</label>
                <div className="w-48 h-48">
                  <ProfilePhotoUpload
                    photo={editingContact.profilePhoto}
                    onChange={(photo) =>
                      setEditingContact({ ...editingContact, profilePhoto: photo })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Name</h3>
              <div className="grid grid-cols-8 gap-3">
                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                  <Select
                    value={editingContact.title}
                    onValueChange={(value) =>
                      setEditingContact({ ...editingContact, title: value })
                    }
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Title" />
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
                  <label className="text-sm font-medium text-gray-700 mb-1 block">First Name</label>
                  <Input
                    value={editingContact.firstName}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, firstName: e.target.value })
                    }
                    placeholder="First name"
                    className="h-10"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Middle</label>
                  <Input
                    value={editingContact.middleName || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, middleName: e.target.value })
                    }
                    placeholder="Middle name"
                    className="h-10"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Last Name</label>
                  <Input
                    value={editingContact.lastName}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, lastName: e.target.value })
                    }
                    placeholder="Last name"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Position/Role</label>
                  <Input
                    value={editingContact.position}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, position: e.target.value })
                    }
                    placeholder="e.g., Project Manager"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contact Type</label>
                  <ContactTypeSelect
                    value={migrateContactType(editingContact.type)}
                    onValueChange={(value) =>
                      setEditingContact({ ...editingContact, type: value })
                    }
                    placeholder="Select contact type"
                    className=""
                  />
                </div>
              </div>
              
              {/* Organisation on its own line */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Organisation</label>
                <OrganizationCombobox
                  organizations={organizations}
                  value={editingContact.organisationId || ""}
                  onValueChange={(value) =>
                    setEditingContact({ ...editingContact, organisationId: value })
                  }
                  placeholder="Select organisation"
                  className="w-full h-10"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              
              {/* Email Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Primary Email</label>
                  <Input
                    type="email"
                    value={editingContact.primaryEmail || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, primaryEmail: e.target.value })
                    }
                    placeholder="primary@example.org"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Secondary Email</label>
                  <Input
                    type="email"
                    value={editingContact.secondaryEmail || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, secondaryEmail: e.target.value })
                    }
                    placeholder="secondary@example.org"
                    className="h-10"
                  />
                </div>
              </div>
              
              {/* Phone and Fax */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number</label>
                  <Input
                    value={editingContact.phone || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, phone: e.target.value })
                    }
                    placeholder="+95 9 123 456 789"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Fax Number</label>
                  <Input
                    value={editingContact.fax || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, fax: e.target.value })
                    }
                    placeholder="+95 1 234 5678"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              <Textarea
                value={editingContact.notes || ""}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, notes: e.target.value })
                }
                placeholder="Add any additional context, special instructions, or relevant information about this contact..."
                rows={4}
                className="w-full resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={handleCancelEdit} className="px-6">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  console.log('[CONTACTS DEBUG] Save button clicked');
                  handleSaveContact();
                }}
                className="px-6"
              >
                {editingIndex === contacts.length ? "Add Contact" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Contact Button */}
      {!editingContact && contacts.length > 0 && (
        <Button onClick={handleAddContact} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Contact
        </Button>
      )}
    </div>
  );
} 