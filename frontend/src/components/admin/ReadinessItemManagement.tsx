'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical,
  ListChecks,
  Loader2,
  AlertCircle,
  ChevronLeft,
  SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

import type { 
  ReadinessChecklistItem, 
  UpsertChecklistItemRequest,
  ApplicableConditions,
} from '@/types/readiness';
import { 
  FINANCING_TYPE_OPTIONS, 
  FINANCING_MODALITY_OPTIONS 
} from '@/types/readiness';
import { apiFetch } from '@/lib/api-fetch';

interface ItemWithTemplate extends ReadinessChecklistItem {
  template?: {
    id: string;
    name: string;
    code: string;
  };
}

interface ReadinessItemManagementProps {
  templateId: string;
  templateName: string;
  onBack?: () => void;
}

export function ReadinessItemManagement({ 
  templateId, 
  templateName,
  onBack 
}: ReadinessItemManagementProps) {
  const [items, setItems] = useState<ItemWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UpsertChecklistItemRequest>({
    template_id: templateId,
    code: '',
    title: '',
    description: '',
    guidance_text: '',
    responsible_agency_type: '',
    display_order: 1,
    is_required: true,
    is_active: true,
    applicable_conditions: {},
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/admin/readiness/items?template_id=${templateId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch items');
      }

      setItems(data.items || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData({
      template_id: templateId,
      code: '',
      title: '',
      description: '',
      guidance_text: '',
      responsible_agency_type: '',
      display_order: items.length + 1,
      is_required: true,
      is_active: true,
      applicable_conditions: {},
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: ItemWithTemplate) => {
    setEditingItem(item);
    setFormData({
      template_id: templateId,
      code: item.code,
      title: item.title,
      description: item.description || '',
      guidance_text: item.guidance_text || '',
      responsible_agency_type: item.responsible_agency_type || '',
      display_order: item.display_order,
      is_required: item.is_required,
      is_active: item.is_active,
      applicable_conditions: item.applicable_conditions || {},
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.title) {
      toast.error('Code and title are required');
      return;
    }

    try {
      setIsSaving(true);

      const url = editingItem
        ? `/api/admin/readiness/items/${editingItem.id}`
        : '/api/admin/readiness/items';

      const response = await fetch(url, {
        method: editingItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save item');
      }

      toast.success(editingItem ? 'Item updated' : 'Item created');
      setIsDialogOpen(false);
      fetchItems();
    } catch (err) {
      console.error('Error saving item:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ItemWithTemplate) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/api/admin/readiness/items/${item.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }

      toast.success('Item deleted');
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const toggleActive = async (item: ItemWithTemplate) => {
    try {
      const response = await apiFetch(`/api/admin/readiness/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      toast.success(`Item ${item.is_active ? 'deactivated' : 'activated'}`);
      fetchItems();
    } catch (err) {
      toast.error('Failed to update item');
    }
  };

  const updateConditions = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      applicable_conditions: {
        ...prev.applicable_conditions,
        [key]: value,
      },
    }));
  };

  const hasConditions = (conditions: ApplicableConditions | undefined) => {
    if (!conditions) return false;
    return Object.keys(conditions).some(key => {
      const val = conditions[key as keyof ApplicableConditions];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'boolean') return true;
      return !!val;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {onBack && (
                  <Button variant="ghost" size="sm" onClick={onBack}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Items: {templateName}
                </CardTitle>
              </div>
              <CardDescription>
                Manage checklist items for this stage
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ListChecks className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No items in this template yet.</p>
              <Button variant="link" onClick={openCreateDialog}>
                Create your first item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Order</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                        {item.display_order}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.is_required ? (
                        <Badge variant="destructive">Required</Badge>
                      ) : (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasConditions(item.applicable_conditions) ? (
                        <Badge variant="outline" className="gap-1">
                          <SlidersHorizontal className="h-3 w-3" />
                          Conditional
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500">All projects</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => toggleActive(item)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Create Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the checklist item.' : 'Create a new checklist item.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="CONCEPT_NOTE"
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  min={1}
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Concept Note Prepared"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A project concept note must be prepared..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guidance_text">Guidance Text</Label>
              <Textarea
                id="guidance_text"
                value={formData.guidance_text || ''}
                onChange={(e) => setFormData({ ...formData, guidance_text: e.target.value })}
                placeholder="Upload the concept note document. Ensure it includes..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible_agency_type">Responsible Agency</Label>
              <Select
                value={formData.responsible_agency_type || ''}
                onValueChange={(value) => setFormData({ ...formData, responsible_agency_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agency type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Implementing Agency">Implementing Agency</SelectItem>
                  <SelectItem value="Ministry of Finance">Ministry of Finance</SelectItem>
                  <SelectItem value="Line Ministry">Line Ministry</SelectItem>
                  <SelectItem value="Ministry of Environment">Ministry of Environment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
                <Label htmlFor="is_required">Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            {/* Applicable Conditions */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm">Applicable Conditions</h4>
              <p className="text-xs text-gray-500">
                Set conditions for when this item should appear. Leave empty to show for all projects.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Financing Types (show only for these)</Label>
                  <div className="flex flex-wrap gap-2">
                    {FINANCING_TYPE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-1 text-sm">
                        <Checkbox
                          checked={(formData.applicable_conditions?.financing_type as string[] || []).includes(option.value)}
                          onCheckedChange={(checked) => {
                            const current = (formData.applicable_conditions?.financing_type as string[]) || [];
                            const newValue = checked
                              ? [...current, option.value]
                              : current.filter(v => v !== option.value);
                            updateConditions('financing_type', newValue.length > 0 ? newValue : undefined);
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Modalities (show only for these)</Label>
                  <div className="flex flex-wrap gap-2">
                    {FINANCING_MODALITY_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-1 text-sm">
                        <Checkbox
                          checked={(formData.applicable_conditions?.modality as string[] || []).includes(option.value)}
                          onCheckedChange={(checked) => {
                            const current = (formData.applicable_conditions?.modality as string[]) || [];
                            const newValue = checked
                              ? [...current, option.value]
                              : current.filter(v => v !== option.value);
                            updateConditions('modality', newValue.length > 0 ? newValue : undefined);
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_infrastructure"
                    checked={formData.applicable_conditions?.is_infrastructure === true}
                    onCheckedChange={(checked) => {
                      updateConditions('is_infrastructure', checked ? true : undefined);
                    }}
                  />
                  <Label htmlFor="is_infrastructure" className="text-sm">
                    Only for infrastructure projects
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReadinessItemManagement;
