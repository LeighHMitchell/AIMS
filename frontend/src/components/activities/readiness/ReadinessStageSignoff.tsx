'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Award, 
  CheckCircle,
  AlertCircle,
  Loader2,
  PenTool
} from 'lucide-react';
import { format } from 'date-fns';

import type { 
  ReadinessStageSignoff as SignoffType,
  ReadinessStageWithData,
  SignOffStageRequest,
} from '@/types/readiness';

interface ReadinessStageSignoffProps {
  signoff: SignoffType | null;
  stage: ReadinessStageWithData;
  canSignOff: boolean;
  onSignOff: (data: SignOffStageRequest) => Promise<void>;
  isUpdating: boolean;
}

export function ReadinessStageSignoff({
  signoff,
  stage,
  canSignOff,
  onSignOff,
  isUpdating,
}: ReadinessStageSignoffProps) {
  const [signatureTitle, setSignatureTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSignOff = async () => {
    if (!signatureTitle.trim()) return;

    await onSignOff({
      signature_title: signatureTitle.trim(),
      remarks: remarks.trim() || null,
    });

    setShowForm(false);
    setSignatureTitle('');
    setRemarks('');
  };

  // Already signed off - show the sign-off details
  if (signoff) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-800">Stage Signed Off</h4>
              <div className="mt-2 space-y-1 text-sm text-green-700">
                <p>
                  <span className="font-medium">Signed by:</span>{' '}
                  {signoff.signed_off_by_user?.name || 'Unknown'}
                </p>
                <p>
                  <span className="font-medium">Title:</span>{' '}
                  {signoff.signature_title || 'Not specified'}
                </p>
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {format(new Date(signoff.signed_off_at), 'MMMM d, yyyy')}
                </p>
                <p>
                  <span className="font-medium">Items:</span>{' '}
                  {signoff.items_completed} completed, {signoff.items_not_required} not required, {signoff.items_total} total
                </p>
                {signoff.remarks && (
                  <p className="mt-2 italic">"{signoff.remarks}"</p>
                )}
              </div>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not yet signed off - show the sign-off form/button
  return (
    <div className="space-y-4">
      {!canSignOff && !showForm && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All required items must be completed or marked as not required before this stage can be signed off.
          </AlertDescription>
        </Alert>
      )}

      {canSignOff && !showForm && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <PenTool className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Ready for Sign-off</p>
              <p className="text-sm text-blue-600">
                All items are complete. You can now sign off this stage.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)}>
            Sign Off Stage
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="border-blue-200">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Award className="h-5 w-5" />
              <h4 className="font-semibold">Sign Off: {stage.name}</h4>
            </div>

            <p className="text-sm text-gray-600">
              By signing off, you certify that all applicable items in this stage have been properly completed or appropriately marked as not required.
            </p>

            <div className="space-y-2">
              <Label htmlFor="signature-title">
                Your Title / Position <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signature-title"
                value={signatureTitle}
                onChange={(e) => setSignatureTitle(e.target.value)}
                placeholder="e.g., Director General, Secretary, Project Director"
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signoff-remarks">
                Remarks (Optional)
              </Label>
              <Textarea
                id="signoff-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any additional notes or comments..."
                rows={2}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-500">
                {stage.progress.completed} completed, {stage.progress.not_required} not required
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setSignatureTitle('');
                    setRemarks('');
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSignOff}
                  disabled={!signatureTitle.trim() || isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      Confirm Sign-off
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ReadinessStageSignoff;
