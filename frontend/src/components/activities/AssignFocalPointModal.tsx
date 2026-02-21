'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  UserSearchableSelect,
  UserOption
} from '@/components/ui/user-searchable-select';
import { Building2, Users, Loader2 } from 'lucide-react';
import { FocalPointType } from '@/types/focal-points';

interface AssignFocalPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (type: FocalPointType) => void;
  selectedUser: UserOption | null;
  onSelectedUserChange: (userId: string | null, userData: UserOption | null) => void;
  actionLoading: string | null;
}

export function AssignFocalPointModal({
  isOpen,
  onClose,
  onAssign,
  selectedUser,
  onSelectedUserChange,
  actionLoading
}: AssignFocalPointModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Focal Point</DialogTitle>
          <DialogDescription>
            Search for a user and assign them as a government or development partner focal point.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Select User</label>
            <UserSearchableSelect
              value={selectedUser?.id || undefined}
              selectedUserData={selectedUser}
              onValueChange={(userId, userData) => {
                onSelectedUserChange(userId, userData);
              }}
              placeholder="Search for a user..."
              searchPlaceholder="Type name or email..."
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => onAssign('government_focal_point')}
            disabled={!selectedUser || actionLoading !== null}
          >
            {actionLoading === 'assign-government_focal_point' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 mr-2" />
            )}
            Assign as Government Focal Point
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onAssign('development_partner_focal_point')}
            disabled={!selectedUser || actionLoading !== null}
          >
            {actionLoading === 'assign-development_partner_focal_point' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Assign as Development Partner Focal Point
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
