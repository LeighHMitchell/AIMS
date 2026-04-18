"use client";

import { RequiredDot } from "@/components/ui/required-dot";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
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
  Save,
  Plus,
  Pencil,
  Star,
  FileCode2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ProjectReference,
  ProjectReferenceFormData,
  ReferenceType,
  REFERENCE_TYPE_LABELS,
  REFERENCE_TYPE_DESCRIPTIONS,
  toProjectReference,
  ProjectReferenceRow,
} from '@/types/project-references';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/api-fetch';

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
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Project References state
  const [projectReferences, setProjectReferences] = useState<ProjectReference[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [showRefDialog, setShowRefDialog] = useState(false);
  const [editingRef, setEditingRef] = useState<ProjectReference | null>(null);
  const [refFormData, setRefFormData] = useState<ProjectReferenceFormData>({
    referenceType: 'government',
    code: '',
    name: '',
    vocabulary: '',
    isPrimary: false,
    notes: '',
  });
  const [savingRef, setSavingRef] = useState(false);

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
    const success = await saveEndorsement(formData, false); // Not silent - show toast for manual save
    if (success) {
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    }
  };

  const handleDelete = async () => {
    if (await confirm({ title: 'Delete government endorsement?', description: "The endorsement will be removed. You'll have a moment to undo.", confirmLabel: 'Delete', cancelLabel: 'Keep' })) {
      const snapshot = { ...formData };
      const success = await deleteEndorsement();
      if (success) {
        setFormData({});
        setHasUnsavedChanges(false);
        setLastSaved(null);
        toast.success('Endorsement removed', {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                const ok = await saveEndorsement(snapshot, false);
                if (ok) {
                  setFormData(snapshot);
                  toast.success('Endorsement restored');
                }
              } catch {
                toast.error("Couldn't restore the endorsement. Please re-enter manually.");
              }
            },
          },
        });
      }
    }
  };

  // Fetch project references
  const fetchProjectReferences = async () => {
    setLoadingRefs(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/project-references`);
      if (response.ok) {
        const data = await response.json();
        setProjectReferences(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching project references:', error);
    } finally {
      setLoadingRefs(false);
    }
  };

  useEffect(() => {
    if (activityId) {
      fetchProjectReferences();
    }
  }, [activityId]);

  // Project reference handlers
  const openRefDialog = (ref?: ProjectReference) => {
    if (ref) {
      setEditingRef(ref);
      setRefFormData({
        referenceType: ref.referenceType,
        code: ref.code,
        name: ref.name || '',
        vocabulary: ref.vocabulary || '',
        isPrimary: ref.isPrimary,
        notes: ref.notes || '',
      });
    } else {
      setEditingRef(null);
      setRefFormData({
        referenceType: 'government',
        code: '',
        name: '',
        vocabulary: '',
        isPrimary: false,
        notes: '',
      });
    }
    setShowRefDialog(true);
  };

  const handleRefFormChange = (field: keyof ProjectReferenceFormData, value: string | boolean) => {
    setRefFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveRef = async () => {
    if (!refFormData.code.trim()) {
      toast.error('Reference code is required.');
      return;
    }

    setSavingRef(true);
    try {
      const url = `/api/activities/${activityId}/project-references`;
      const method = editingRef ? 'PUT' : 'POST';
      const body = editingRef
        ? { ...refFormData, referenceId: editingRef.id }
        : refFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingRef ? 'Reference updated' : 'Reference added');
        setShowRefDialog(false);
        fetchProjectReferences();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Couldn\u2019t save the reference. Check your input and try again.');
      }
    } catch (error) {
      toast.error('Couldn\u2019t save the reference. Check your connection and try again.');
    } finally {
      setSavingRef(false);
    }
  };

  const handleDeleteRef = async (refId: string) => {
    if (!(await confirm({ title: 'Delete project reference?', description: "The reference will be removed. You'll have a moment to undo.", confirmLabel: 'Delete', cancelLabel: 'Keep' }))) return;

    const snapshot = projectReferences.find(r => r.id === refId);

    try {
      const response = await apiFetch(`/api/activities/${activityId}/project-references?referenceId=${refId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Reference removed', snapshot ? {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await apiFetch(`/api/activities/${activityId}/project-references`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    code: (snapshot as any).code,
                    description: (snapshot as any).description,
                    is_primary: (snapshot as any).is_primary,
                  }),
                });
                await fetchProjectReferences();
                toast.success('Reference restored');
              } catch {
                toast.error("Couldn't restore the reference. Please add it again manually.");
              }
            },
          },
        } : undefined);
        fetchProjectReferences();
      } else {
        toast.error("Couldn't remove the reference. Please try again in a moment.");
      }
    } catch (error) {
      toast.error("Couldn't remove the reference. Please try again in a moment.");
    }
  };

  const handleSetPrimary = async (ref: ProjectReference) => {
    setSavingRef(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/project-references`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceId: ref.id,
          isPrimary: true,
        }),
      });

      if (response.ok) {
        toast.success('Primary reference updated');
        fetchProjectReferences();
      } else {
        toast.error('Failed to set primary reference');
      }
    } catch (error) {
      toast.error('Failed to set primary reference');
    } finally {
      setSavingRef(false);
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
        <div className="flex items-center gap-2 text-[hsl(var(--success-icon))]">
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
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {formData.validation_status === 'validated' && (
                  <CheckCircle className="h-5 w-5 text-[hsl(var(--success-icon))]" />
                )}
                {formData.validation_status === 'rejected' && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  {formData.validating_authority}
                </div>
              )}
              {formData.validation_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                      <div className="text-xs text-muted-foreground">{option.description}</div>
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
                        <div className="text-xs text-muted-foreground">{category.description}</div>
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

      {/* Project References Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5" />
            Project References
          </CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => openRefDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reference
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Link this activity to government budget codes, donor project IDs, or internal tracking numbers.
            These references enable reconciliation with the national budget system.
          </p>

          {loadingRefs ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : projectReferences.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <img src="/images/empty-bee.webp" alt="No project references" className="h-32 mx-auto mb-4 opacity-50" />
              <h3 className="text-base font-semibold mb-2">No project references</h3>
              <p className="text-muted-foreground mb-2">Add government project reference codes for this activity.</p>
              {canEdit && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => openRefDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Reference
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Vocabulary</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectReferences.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell>
                      <Badge variant={
                        ref.referenceType === 'government' ? 'default' :
                        ref.referenceType === 'donor' ? 'secondary' : 'outline'
                      }>
                        {REFERENCE_TYPE_LABELS[ref.referenceType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        {ref.code}
                        {ref.isPrimary && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ref.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{ref.vocabulary || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit && !ref.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(ref)}
                            title="Set as primary"
                            disabled={savingRef}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRefDialog(ref)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRef(ref.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Project Reference Dialog */}
      <Dialog open={showRefDialog} onOpenChange={setShowRefDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRef ? 'Edit Project Reference' : 'Add Project Reference'}
            </DialogTitle>
            <DialogDescription>
              {editingRef ? 'Update the project reference details.' : 'Add a government or donor project reference identifier.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reference Type</Label>
              <Select
                value={refFormData.referenceType}
                onValueChange={(value: ReferenceType) => handleRefFormChange('referenceType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REFERENCE_TYPE_LABELS) as ReferenceType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div>
                        <div className="font-medium">{REFERENCE_TYPE_LABELS[type]}</div>
                        <div className="text-xs text-muted-foreground">{REFERENCE_TYPE_DESCRIPTIONS[type]}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Code <RequiredDot /></Label>
              <Input
                value={refFormData.code}
                onChange={(e) => handleRefFormChange('code', e.target.value)}
                placeholder="e.g., PIP-2024-001, DFID-12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={refFormData.name || ''}
                onChange={(e) => handleRefFormChange('name', e.target.value)}
                placeholder="Human-readable name"
              />
            </div>

            <div className="space-y-2">
              <Label>Vocabulary</Label>
              <Input
                value={refFormData.vocabulary || ''}
                onChange={(e) => handleRefFormChange('vocabulary', e.target.value)}
                placeholder="e.g., national_pip, ministry_code"
              />
              <p className="text-xs text-muted-foreground">
                The standard or system this code comes from
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={refFormData.isPrimary}
                onChange={(e) => handleRefFormChange('isPrimary', e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Primary reference for this type
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={refFormData.notes || ''}
                onChange={(e) => handleRefFormChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRef} disabled={savingRef}>
              {savingRef ? 'Saving...' : editingRef ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!canEdit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are viewing this endorsement in read-only mode. Only government users can edit endorsement data.
          </AlertDescription>
        </Alert>
      )}
      <ConfirmDialog />
    </div>
  );
}
