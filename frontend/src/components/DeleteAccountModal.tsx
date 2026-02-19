"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from '@/lib/api-fetch';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  userEmail: string;
  userId: string;
  userName: string;
}

export function DeleteAccountModal({ 
  isOpen, 
  onClose, 
  onDeleted,
  userEmail,
  userId,
  userName,
}: DeleteAccountModalProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailMatch = confirmEmail.toLowerCase() === userEmail.toLowerCase();

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await apiFetch(`/api/users/export-data?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export data');
      }

      // Get the filename from content-disposition header or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `aims-data-export-${new Date().toISOString().split('T')[0]}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          fileName = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Data exported successfully");
    } catch (err) {
      console.error('Export error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEmailMatch) {
      setError("Please enter your email address exactly as shown to confirm deletion.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await apiFetch('/api/users/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          confirmEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to delete account');
      }

      toast.success("Account deleted successfully");
      onDeleted();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while deleting
    setConfirmEmail("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Your Account
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">The following will be permanently deleted:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your profile and personal information</li>
                <li>Your activity bookmarks</li>
                <li>Your notifications</li>
                <li>Your feedback submissions</li>
              </ul>
              <p className="mt-2 text-sm">
                Your comments will be anonymized and focal point assignments will be removed.
              </p>
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Download Your Data First</p>
                <p className="text-xs text-muted-foreground">
                  Export all your data before deleting your account
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportData}
                disabled={isExporting || isDeleting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Data
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmEmail">
              To confirm, type your email address: <strong>{userEmail}</strong>
            </Label>
            <Input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
                setError(null);
              }}
              placeholder="Enter your email to confirm"
              disabled={isDeleting}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={!isEmailMatch || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                Delete My Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


