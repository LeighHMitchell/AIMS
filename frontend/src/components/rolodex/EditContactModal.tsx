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
import { Loader2, Camera } from 'lucide-react';

interface EditContactModalProps {
  person: RolodexPerson;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedPerson: RolodexPerson) => void;
}

export function EditContactModal({ person, isOpen, onClose, onUpdate }: EditContactModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: person.name || '',
    email: person.email || '',
    phone: person.phone || '',
    position: person.position || '',
    organization_name: person.organization_name || '',
    department: person.department || '',
    notes: person.notes || '',
    profile_photo: person.profile_photo || '',
  });

  // Reset form data when person changes
  useEffect(() => {
    setFormData({
      name: person.name || '',
      email: person.email || '',
      phone: person.phone || '',
      position: person.position || '',
      organization_name: person.organization_name || '',
      department: person.department || '',
      notes: person.notes || '',
      profile_photo: person.profile_photo || '',
    });
  }, [person]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare update data based on person source
      const updateData: any = {
        id: person.id,
        source: person.source,
        ...formData
      };

      // Prepare data for rolodex API
      if (person.source === 'user') {
        // Map fields for user updates
        updateData.first_name = formData.name.split(' ')[0] || '';
        updateData.last_name = formData.name.split(' ').slice(1).join(' ') || '';
        updateData.position = formData.position; // Keep as position for rolodex API
        updateData.phone = formData.phone;
        updateData.profile_photo = formData.profile_photo;
      } else if (person.source === 'activity_contact') {
        // Map fields for activity contact updates
        updateData.first_name = formData.name.split(' ')[0] || '';
        updateData.last_name = formData.name.split(' ').slice(1).join(' ') || '';
      }

      // Use rolodex API for all updates
      const apiUrl = '/api/rolodex';

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      const updatedData = await response.json();
      
      // Create updated person object
      const updatedPerson: RolodexPerson = {
        ...person,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        organization_name: formData.organization_name,
        department: formData.department,
        notes: formData.notes,
        profile_photo: formData.profile_photo,
      };

      onUpdate(updatedPerson);
      toast.success('Contact updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update contact information for {person.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-sm font-medium">Profile Photo</div>
            <ProfilePhotoUpload
              currentPhoto={formData.profile_photo}
              userInitials={getInitials(formData.name || 'U')}
              onPhotoChange={handlePhotoChange}
              className="mb-2"
            />
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position/Title</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
              />
            </div>
          </div>

          {/* Organization Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization_name}
                onChange={(e) => handleInputChange('organization_name', e.target.value)}
                disabled={person.source === 'user'} // Users have fixed organizations
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes about this contact..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
