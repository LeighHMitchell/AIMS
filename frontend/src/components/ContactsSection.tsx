import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Phone, Mail, Printer, User, Building } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

interface Contact {
  id?: string;
  type: string;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  organisation?: string;
  phone?: string;
  fax?: string;
  email?: string;
  profilePhoto?: string;
  notes?: string;
}

interface ContactsSectionProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}

const CONTACT_TYPES = [
  "Implementing Partner",
  "Funding Agency",
  "Government Liaison",
  "Technical Advisor",
  "Field Coordinator",
  "M&E Officer",
  "Other"
];

const TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Eng."];

export default function ContactsSection({ contacts, onChange }: ContactsSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

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
      type: "Implementing Partner",
      title: "Mr.",
      firstName: "",
      lastName: "",
      position: "",
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
      } else {
        // Updating existing contact
        updatedContacts[editingIndex] = editingContact;
        console.log('[CONTACTS DEBUG] Updated contact at index:', editingIndex);
      }
    }

    console.log('[CONTACTS DEBUG] Updated contacts array:', updatedContacts);
    console.log('[CONTACTS DEBUG] Calling onChange with:', updatedContacts);
    
    onChange(updatedContacts);
    setEditingContact(null);
    setEditingIndex(null);
    toast.success("Contact saved successfully");
  };

  const handleRemoveContact = (index: number) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);
    onChange(updatedContacts);
    toast.success("Contact removed");
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
              ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
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
        <h2 className="text-2xl font-bold">ACTIVITY CONTACTS</h2>
        <p className="text-gray-600 mt-2">
          Add contact information for key personnel involved in this activity
        </p>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Contact Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Type *</label>
                  <Select
                    value={editingContact.type}
                    onValueChange={(value) =>
                      setEditingContact({ ...editingContact, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Select
                      value={editingContact.title}
                      onValueChange={(value) =>
                        setEditingContact({ ...editingContact, title: value })
                      }
                    >
                      <SelectTrigger>
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
                  <div className="space-y-2 col-span-3">
                    <label className="text-sm font-medium">First Name *</label>
                    <Input
                      value={editingContact.firstName}
                      onChange={(e) =>
                        setEditingContact({ ...editingContact, firstName: e.target.value })
                      }
                      placeholder="First name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Middle Name</label>
                    <Input
                      value={editingContact.middleName || ""}
                      onChange={(e) =>
                        setEditingContact({ ...editingContact, middleName: e.target.value })
                      }
                      placeholder="Middle name"
                    />
                  </div>
                  <div className="space-y-2">
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

                {/* Position */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Position/Role *</label>
                  <Input
                    value={editingContact.position}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, position: e.target.value })
                    }
                    placeholder="e.g., Field Coordinator"
                  />
                </div>

                {/* Organisation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organisation</label>
                  <Input
                    value={editingContact.organisation || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, organisation: e.target.value })
                    }
                    placeholder="If different from main partner"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Profile Photo */}
                <ProfilePhotoUpload
                  photo={editingContact.profilePhoto}
                  onChange={(photo) =>
                    setEditingContact({ ...editingContact, profilePhoto: photo })
                  }
                />

                {/* Contact Details */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={editingContact.phone || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, phone: e.target.value })
                    }
                    placeholder="+95 9 123 456 789"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={editingContact.email || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, email: e.target.value })
                    }
                    placeholder="email@example.org"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fax Number</label>
                  <Input
                    value={editingContact.fax || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, fax: e.target.value })
                    }
                    placeholder="+95 1 234 5678"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
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
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={() => {
                console.log('[CONTACTS DEBUG] Save button clicked');
                handleSaveContact();
              }}>
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