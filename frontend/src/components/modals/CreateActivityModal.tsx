'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateActivityModal({ isOpen, onClose }: CreateActivityModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter an activity title');
      return;
    }

    setIsCreating(true);
    
    try {
      // Create the activity with just the title
      const response = await apiFetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          activityStatus: '', // No default status
          publicationStatus: 'draft',
          submissionStatus: 'draft',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create activity');
      }

      const activity = await response.json();
      
      toast.success('Activity created successfully!', {
        description: 'You can now add more details to your activity.',
      });

      // Close modal and redirect to the activity editor
      onClose();
      router.push(`/activities/new?id=${activity.id}`);
      
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error('Failed to create activity. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Activity
          </DialogTitle>
          <DialogDescription>
            Start by giving your activity a clear, descriptive title. You can add more details later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="activity-title">Activity Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter activity title..."
              disabled={isCreating}
              className="w-full"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              This will be the main identifier for your activity.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
            className="min-w-[100px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Activity'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
