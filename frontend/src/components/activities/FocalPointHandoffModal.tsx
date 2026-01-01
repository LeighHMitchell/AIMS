'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  UserSearchableSelect,
  UserOption 
} from '@/components/ui/user-searchable-select';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { FocalPointHandoffModalProps } from '@/types/focal-points';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FocalPointHandoffModal({
  isOpen,
  onClose,
  onConfirm,
  currentFocalPointName,
  type,
}: FocalPointHandoffModalProps) {
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeLabel = type === 'government_focal_point' 
    ? 'Government Focal Point' 
    : 'Development Partner Focal Point';

  const handleConfirm = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(selectedUser.id);
      setSelectedUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedUser(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Handoff Focal Point Role
          </DialogTitle>
          <DialogDescription>
            Transfer your {typeLabel} responsibility to another user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              You are currently the <strong>{typeLabel}</strong> for this activity.
              Select a user to transfer this role to. They will receive a notification
              and must accept the handoff before becoming the new focal point.
            </AlertDescription>
          </Alert>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Select User to Handoff To
            </label>
            <UserSearchableSelect
              value={selectedUser?.id}
              onValueChange={(userId, userData) => {
                setSelectedUser(userId && userData ? userData : null);
              }}
              placeholder="Search for a user..."
              searchPlaceholder="Type name or email..."
              disabled={isSubmitting}
            />
          </div>

          {selectedUser && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <span className="font-medium">{currentFocalPointName}</span> 
                {' → '}
                <span className="font-medium text-slate-900">{selectedUser.name}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedUser.email}
                {selectedUser.organization && ` • ${selectedUser.organization}`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUser || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Initiate Handoff
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


