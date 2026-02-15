'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronsUpDown, Check, Upload, X, User } from 'lucide-react';
import { CountryCodeSearchableSelect } from '@/components/forms/CountryCodeSearchableSelect';
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
  CommandGroup,
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
import { OrganizationSearchableSelect, type Organization as OrgType } from '@/components/ui/organization-searchable-select';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { countries } from '@/data/countries';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

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

interface ContactFormProps {
  contact?: Contact | null;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
  isOpen?: boolean;
}

export default function ContactForm({ contact, onSave, onCancel, isOpen = true }: ContactFormProps) {
  const [formData, setFormData] = useState<Contact>({
    type: '1',
    firstName: '',
    lastName: '',
    jobTitle: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [organizations, setOrganizations] = useState<OrgType[]>([]);
  const [contactTypeOpen, setContactTypeOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useSystemSettings();

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await apiFetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data);
        }
      } catch (error) {
        console.error('[ContactForm] Error fetching organizations:', error);
      }
    };
    fetchOrganizations();
  }, []);

  // Load contact data when editing
  useEffect(() => {
    if (contact) {
      setFormData({
        ...contact,
        profilePhoto: contact.profilePhoto,
        jobTitle: contact.jobTitle || contact.position, // Backward compatibility
        countryCode: contact.countryCode,
        department: contact.department,
        organisationAcronym: contact.organisationAcronym,
        website: contact.website,
        mailingAddress: contact.mailingAddress
      });
    }
  }, [contact]);

  // Prefill country code from system settings
  useEffect(() => {
    if (!contact?.countryCode && settings?.homeCountryData?.dialCode) {
      setFormData(prev => ({
        ...prev,
        countryCode: settings.homeCountryData.dialCode
      }));
    }
  }, [contact, settings]);


  const handleChange = (field: keyof Contact, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
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

    // Required fields
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.type) {
      newErrors.type = 'Contact type is required';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Website validation
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
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
      setErrors(prev => ({ ...prev, profilePhoto: errorMsg }));
      toast.error(errorMsg);
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = 'Image size must be less than 2MB';
      setErrors(prev => ({ ...prev, profilePhoto: errorMsg }));
      toast.error(errorMsg);
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, profilePhoto: base64String }));
      // Clear any previous errors
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-gray-900">
            {contact?.id ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {contact?.id 
              ? 'Update the contact information for this activity.'
              : 'Add a new contact person for this activity.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Photo Upload */}
          <div>
            <Label>Profile Photo</Label>
            <div className="flex flex-col items-center gap-3">
              {/* Photo Preview/Upload Area */}
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
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
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
              
              {/* Upload Instructions */}
              <p className="text-xs text-gray-500 text-center">
                Drag & drop or click to upload
                <br />
                Max 2MB • JPEG, PNG, GIF, WebP
              </p>
              {errors.profilePhoto && (
                <p className="text-xs text-red-500 text-center">{errors.profilePhoto}</p>
              )}
            </div>
          </div>

          {/* Contact Type */}
          <div>
            <Label htmlFor="type">
              Contact Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
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
                  <div className="flex items-center gap-2">
                    {selectedContactType && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChange('type', '');
                        }}
                        className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                        aria-label="Clear selection"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </div>
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
                        className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
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
                          <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
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
            First Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
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
            Last Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
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

      {/* Focal Point Checkbox */}
      <div className="flex items-center space-x-2 -mt-2">
        <Checkbox
          id="isFocalPoint"
          checked={formData.isFocalPoint || false}
          onCheckedChange={(checked) => handleChange('isFocalPoint', checked)}
        />
        <Label htmlFor="isFocalPoint" className="cursor-pointer text-sm">
          This contact is a focal point for the activity
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
            placeholder="e.g., Project Manager"
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

      {/* Organisation */}
      <div>
        <Label htmlFor="organisation">Organisation</Label>
        <OrganizationSearchableSelect
          organizations={organizations}
          value={formData.organisationId || ''}
          onValueChange={(orgId) => {
            const org = organizations.find(o => o.id === orgId);
            setFormData(prev => ({
              ...prev,
              organisationId: orgId,
              organisation: org?.name || '',
              organisationAcronym: org?.acronym
            }));
          }}
          placeholder="Select organization..."
        />
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
            dropdownId="contact-country-code"
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

        </form>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" form="contact-form">
            {contact ? 'Update Contact' : 'Add Contact to Activity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

