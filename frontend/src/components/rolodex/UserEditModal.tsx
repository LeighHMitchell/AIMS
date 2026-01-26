import React, { useState, useEffect } from 'react';
import { RolodexPerson } from '@/app/api/rolodex/route';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { toast } from 'sonner';
import { Loader2, Camera, Building2, User, Mail, Phone, Briefcase } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

interface UserEditModalProps {
  person: RolodexPerson;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedPerson: RolodexPerson) => void;
}

const USER_ROLES = [
  { value: 'super_user', label: 'Super User' },
  { value: 'government_partner_tier_1', label: 'Government Partner T1' },
  { value: 'government_partner_tier_2', label: 'Government Partner T2' },
  { value: 'development_partner_tier_1', label: 'Data Submission' },
  { value: 'development_partner_tier_2', label: 'Review & Approval' },
  { value: 'orphan', label: 'Unassigned User' },
];

export function UserEditModal({ person, isOpen, onClose, onUpdate }: UserEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym?: string }>>([]);
  const [formData, setFormData] = useState({
    first_name: person.first_name || '',
    last_name: person.last_name || '',
    email: person.email || '',
    phone: person.phone || '',
    job_title: person.job_title || '',
    department: person.department || '',
    role: person.role || '',
    organization_id: person.organization_id || '',
    profile_photo: person.profile_photo || '',
  });

  // Reset form data when person changes
  useEffect(() => {
    setFormData({
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      email: person.email || '',
      phone: person.phone || '',
      job_title: person.job_title || '',
      department: person.department || '',
      role: person.role || '',
      organization_id: person.organization_id || '',
      profile_photo: person.profile_photo || '',
    });
  }, [person]);

  // Fetch organizations for dropdown
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await apiFetch('/api/organizations');
        if (response.ok) {
          const orgs = await response.json();
          setOrganizations(orgs);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };

    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoChange = async (photoUrl: string) => {
    setFormData(prev => ({
      ...prev,
      profile_photo: photoUrl
    }));
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare update data for users API
      const updateData = {
        id: person.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
        job_title: formData.job_title,
        department: formData.department,
        telephone: formData.phone,
        organization_id: formData.organization_id || null,
        avatar_url: formData.profile_photo,
      };

      console.log('Updating user with data:', updateData);

      const response = await apiFetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || 'Failed to update user');
      }

      const updatedData = await response.json();
      
      // Create updated person object for the UI
      const updatedPerson: RolodexPerson = {
        ...person,
        first_name: formData.first_name,
        last_name: formData.last_name,
        name: `${formData.first_name} ${formData.last_name}`.trim() || person.email || 'Unknown User',
        email: formData.email,
        role: formData.role,
        job_title: formData.job_title,
        department: formData.department,
        phone: formData.phone,
        organization_id: formData.organization_id,
        profile_photo: formData.profile_photo,
        role_label: formData.role || 'User',
      };

      onUpdate(updatedPerson);
      toast.success('User updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOrg = organizations.find(org => org.id === formData.organization_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User Profile
          </DialogTitle>
          <DialogDescription>
            Update user information for {person.first_name} {person.last_name} ({person.email})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-sm font-medium">Profile Photo</div>
            <ProfilePhotoUpload
              currentPhoto={formData.profile_photo}
              userInitials={getInitials(formData.first_name, formData.last_name)}
              onPhotoChange={handlePhotoChange}
              className="mb-2"
            />
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => handleInputChange('job_title', e.target.value)}
                  placeholder="e.g. Project Manager, Director"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="e.g. Operations, Finance"
                />
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              System Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">User Role *</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Select value={formData.organization_id} onValueChange={(value) => handleInputChange('organization_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Organization</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} {org.acronym && `(${org.acronym})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Current Assignment Display */}
          {selectedOrg && (
            <div className="bg-slate-50 p-4 rounded-md">
              <div className="text-sm font-medium text-slate-700 mb-2">Current Assignment</div>
              <div className="text-sm text-slate-600">
                <strong>Organization:</strong> {selectedOrg.name} {selectedOrg.acronym && `(${selectedOrg.acronym})`}
              </div>
              <div className="text-sm text-slate-600">
                <strong>Role:</strong> {USER_ROLES.find(r => r.value === formData.role)?.label || formData.role}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
