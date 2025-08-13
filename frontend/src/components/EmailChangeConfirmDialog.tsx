"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Mail } from "lucide-react";
import { toast } from "sonner";

interface EmailChangeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newEmail: string) => Promise<void>;
  currentEmail: string;
  userName: string;
  userId: string;
}

export function EmailChangeConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  currentEmail, 
  userName, 
  userId 
}: EmailChangeConfirmDialogProps) {
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateEmails = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      newErrors.newEmail = "Please enter a valid email address";
    }
    
    // Check if emails match
    if (newEmail !== confirmEmail) {
      newErrors.confirmEmail = "Email addresses do not match";
    }
    
    // Check if new email is different from current
    if (newEmail === currentEmail) {
      newErrors.newEmail = "New email must be different from current email";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateEmails()) {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(newEmail);
      toast.success("Email address updated successfully");
      handleClose();
    } catch (error) {
      console.error('Email change error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update email address");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewEmail("");
    setConfirmEmail("");
    setErrors({});
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Change Email Address
          </DialogTitle>
          <DialogDescription>
            Change the email address for <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">Important Notice</p>
              <p>Changing the email will update both the user's login credentials and profile. The user will need to use the new email address to log in.</p>
            </div>
          </div>

          {/* Current Email */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Current Email</Label>
            <div className="mt-1 p-2 bg-muted rounded-md text-sm">
              {currentEmail}
            </div>
          </div>

          {/* New Email */}
          <div>
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (errors.newEmail) {
                  setErrors(prev => ({ ...prev, newEmail: "" }));
                }
              }}
              placeholder="Enter new email address"
              className={errors.newEmail ? "border-red-500" : ""}
            />
            {errors.newEmail && (
              <p className="text-xs text-red-600 mt-1">{errors.newEmail}</p>
            )}
          </div>

          {/* Confirm Email */}
          <div>
            <Label htmlFor="confirmEmail">Confirm New Email</Label>
            <Input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
                if (errors.confirmEmail) {
                  setErrors(prev => ({ ...prev, confirmEmail: "" }));
                }
              }}
              placeholder="Confirm new email address"
              className={errors.confirmEmail ? "border-red-500" : ""}
            />
            {errors.confirmEmail && (
              <p className="text-xs text-red-600 mt-1">{errors.confirmEmail}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading || !newEmail || !confirmEmail}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? "Updating..." : "Change Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
