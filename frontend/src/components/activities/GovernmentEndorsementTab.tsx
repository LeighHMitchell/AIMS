"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGovernmentEndorsement } from '@/hooks/use-government-endorsement';
import { GovernmentEndorsementFormData, VALIDATION_STATUS_OPTIONS, IATI_DOCUMENT_CATEGORIES } from '@/types/government-endorsement';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Calendar, 
  Building, 
  Upload,
  Trash2,
  Save
} from 'lucide-react';
import { format } from 'date-fns';

interface GovernmentEndorsementTabProps {
  activityId: string;
  readOnly?: boolean;
}

export default function GovernmentEndorsementTab({ 
  activityId, 
  readOnly = false 
}: GovernmentEndorsementTabProps) {
  const { user } = useUser();
  const { 
    endorsement, 
    loading, 
    saving, 
    error, 
    saveEndorsement, 
    deleteEndorsement,
    refreshEndorsement 
  } = useGovernmentEndorsement(activityId);

  // Form state
  const [formData, setFormData] = useState<GovernmentEndorsementFormData>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Check if user can edit (government users or super users)
  const canEdit = !readOnly && (
    user?.role?.includes('gov_') || 
    user?.role === 'super_user'
  );

  // Initialize form data when endorsement loads
  useEffect(() => {
    if (endorsement) {
      setFormData({
        effective_date: endorsement.effective_date || '',
        validation_status: endorsement.validation_status || undefined,
        validating_authority: endorsement.validating_authority || '',
        validation_notes: endorsement.validation_notes || '',
        validation_date: endorsement.validation_date || '',
        document_title: endorsement.document_title || '',
        document_description: endorsement.document_description || '',
        document_url: endorsement.document_url || '',
        document_category: endorsement.document_category || 'A09',
        document_language: endorsement.document_language || 'en',
        document_date: endorsement.document_date || '',
      });
      setHasUnsavedChanges(false);
      setLastSaved(new Date(endorsement.updated_at));
    }
  }, [endorsement]);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !canEdit) return;

    const timeoutId = setTimeout(async () => {
      const success = await saveEndorsement(formData);
      if (success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [formData, hasUnsavedChanges, canEdit, saveEndorsement]);

  const handleFieldChange = (field: keyof GovernmentEndorsementFormData, value: string | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleManualSave = async () => {
    const success = await saveEndorsement(formData);
    if (success) {
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this government endorsement? This action cannot be undone.')) {
      const success = await deleteEndorsement();
      if (success) {
        setFormData({});
        setHasUnsavedChanges(false);
        setLastSaved(null);
      }
    }
  };

  const getSaveIndicator = () => {
    if (saving) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Clock className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      );
    }
    
    if (hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Unsaved changes</span>
        </div>
      );
    }
    
    if (lastSaved) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">
            Saved {format(lastSaved, 'HH:mm:ss')}
          </span>
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canEdit && !endorsement) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No government endorsement data available. Only government users can create and manage endorsement records.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with save status */}
      <div className="flex items-center justify-between">
        <div>
        </div>
        <div className="flex items-center gap-4">
          {getSaveIndicator()}
          {canEdit && (
            <div className="flex gap-2">
              <Button
                onClick={handleManualSave}
                disabled={saving || !hasUnsavedChanges}
                size="sm"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              {endorsement && (
                <Button
                  onClick={handleDelete}
                  disabled={saving}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Status Overview */}
      {formData.validation_status && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {formData.validation_status === 'validated' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {formData.validation_status === 'rejected' && (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                {formData.validation_status === 'more_info_requested' && (
                  <Clock className="h-5 w-5 text-amber-600" />
                )}
                <Badge 
                  variant={
                    formData.validation_status === 'validated' ? 'default' :
                    formData.validation_status === 'rejected' ? 'destructive' : 'secondary'
                  }
                >
                  {VALIDATION_STATUS_OPTIONS.find(opt => opt.value === formData.validation_status)?.label}
                </Badge>
              </div>
              {formData.validating_authority && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4" />
                  {formData.validating_authority}
                </div>
              )}
              {formData.validation_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(formData.validation_date), 'MMM dd, yyyy')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Endorsement Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Status */}
          <div className="space-y-2">
            <Label htmlFor="validation_status" className="flex items-center gap-2">
              Validation Status
              <HelpTextTooltip content="Current status of government validation for this activity" />
            </Label>
            <Select
              value={formData.validation_status || ''}
              onValueChange={(value) => handleFieldChange('validation_status', value as any)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select validation status" />
              </SelectTrigger>
              <SelectContent>
                {VALIDATION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Validating Authority */}
          <div className="space-y-2">
            <Label htmlFor="validating_authority" className="flex items-center gap-2">
              Validating Authority
              <HelpTextTooltip content="Government ministry, department, or focal point confirming the endorsement" />
            </Label>
            <Input
              id="validating_authority"
              value={formData.validating_authority || ''}
              onChange={(e) => handleFieldChange('validating_authority', e.target.value)}
              placeholder="e.g., Ministry of Finance, Department of Planning"
              disabled={!canEdit}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Effective Date
                <HelpTextTooltip content="Official date when the agreement, MOU, or government endorsement takes effect" />
              </Label>
              <EnhancedDatePicker
                value={formData.effective_date ? new Date(formData.effective_date) : undefined}
                onChange={(date) => handleFieldChange('effective_date', date?.toISOString().split('T')[0])}
                placeholder="Select effective date"
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Validation Date
                <HelpTextTooltip content="Date when the government actually reviewed and approved the activity" />
              </Label>
              <EnhancedDatePicker
                value={formData.validation_date ? new Date(formData.validation_date) : undefined}
                onChange={(date) => handleFieldChange('validation_date', date?.toISOString().split('T')[0])}
                placeholder="Select validation date"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Validation Notes */}
          <div className="space-y-2">
            <Label htmlFor="validation_notes" className="flex items-center gap-2">
              Validation Notes / Conditions
              <HelpTextTooltip content="Any conditions, clarifications, or explanatory notes from the government" />
            </Label>
            <Textarea
              id="validation_notes"
              value={formData.validation_notes || ''}
              onChange={(e) => handleFieldChange('validation_notes', e.target.value)}
              placeholder="Enter any conditions, clarifications, or notes..."
              rows={4}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Reference Document(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Title and Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document_title" className="flex items-center gap-2">
                Document Title
                <HelpTextTooltip content="Short title of the MOU, agreement, or endorsement document" />
              </Label>
              <Input
                id="document_title"
                value={formData.document_title || ''}
                onChange={(e) => handleFieldChange('document_title', e.target.value)}
                placeholder="e.g., Memorandum of Understanding - Project ABC"
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_description" className="flex items-center gap-2">
                Document Description
                <HelpTextTooltip content="Optional description of the document contents and purpose" />
              </Label>
              <Textarea
                id="document_description"
                value={formData.document_description || ''}
                onChange={(e) => handleFieldChange('document_description', e.target.value)}
                placeholder="Brief description of the document..."
                rows={3}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Document Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Document Category
                <HelpTextTooltip content="IATI document category classification" />
              </Label>
              <Select
                value={formData.document_category || 'A09'}
                onValueChange={(value) => handleFieldChange('document_category', value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IATI_DOCUMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div>
                        <div className="font-medium">{category.value} - {category.label}</div>
                        <div className="text-xs text-gray-500">{category.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Document Language
                <HelpTextTooltip content="Primary language of the document" />
              </Label>
              <Select
                value={formData.document_language || 'en'}
                onValueChange={(value) => handleFieldChange('document_language', value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Document Date
                <HelpTextTooltip content="Date when the document was created or signed" />
              </Label>
              <EnhancedDatePicker
                value={formData.document_date ? new Date(formData.document_date) : undefined}
                onChange={(date) => handleFieldChange('document_date', date?.toISOString().split('T')[0])}
                placeholder="Select document date"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Document URL */}
          <div className="space-y-2">
            <Label htmlFor="document_url" className="flex items-center gap-2">
              Document URL
              <HelpTextTooltip content="Link to the uploaded document or external URL" />
            </Label>
            <Input
              id="document_url"
              type="url"
              value={formData.document_url || ''}
              onChange={(e) => handleFieldChange('document_url', e.target.value)}
              placeholder="https://example.com/document.pdf"
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {!canEdit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are viewing this endorsement in read-only mode. Only government users can edit endorsement data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
