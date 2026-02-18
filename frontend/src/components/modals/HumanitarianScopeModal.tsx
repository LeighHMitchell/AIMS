"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Save, Trash2 } from 'lucide-react';
import { HumanitarianScope } from '@/types/humanitarian';
import { HumanitarianVocabularySelect } from '@/components/forms/HumanitarianVocabularySelect';
import { HumanitarianTypeSelect } from '@/components/forms/HumanitarianTypeSelect';
import { EmergencySearchableSelect } from '@/components/forms/EmergencySearchableSelect';
import { LanguageSelect } from '@/components/forms/LanguageSelect';
import { toast } from 'sonner';

interface HumanitarianScopeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (scope: HumanitarianScope) => Promise<void>;
  editingScope?: HumanitarianScope | null;
}

export function HumanitarianScopeModal({
  open,
  onClose,
  onSave,
  editingScope,
}: HumanitarianScopeModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<HumanitarianScope>({
    type: '1',
    vocabulary: '1-2',
    code: '',
    vocabulary_uri: '',
    narratives: [{ language: 'en', narrative: '' }],
  });

  const isEditing = !!editingScope?.id;

  useEffect(() => {
    if (open) {
      if (editingScope) {
        setFormData({ ...editingScope });
      } else {
        setFormData({
          type: '1',
          vocabulary: '1-2',
          code: '',
          vocabulary_uri: '',
          narratives: [{ language: 'en', narrative: '' }],
        });
      }
    }
  }, [open, editingScope]);

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast.error('Code is required');
      return;
    }
    if (!formData.narratives.some(n => n.narrative.trim())) {
      toast.error('At least one narrative is required');
      return;
    }

    const cleanedScope: HumanitarianScope = {
      ...formData,
      narratives: formData.narratives.filter(n => n.narrative.trim()),
    };

    setSaving(true);
    try {
      await onSave(cleanedScope);
      onClose();
    } catch {
      // onSave handles error toasts
    } finally {
      setSaving(false);
    }
  };

  const addNarrative = () => {
    setFormData({
      ...formData,
      narratives: [...formData.narratives, { language: 'en', narrative: '' }],
    });
  };

  const updateNarrative = (index: number, field: 'language' | 'narrative', value: string) => {
    const newNarratives = [...formData.narratives];
    newNarratives[index] = { ...newNarratives[index], [field]: value };
    setFormData({ ...formData, narratives: newNarratives });
  };

  const removeNarrative = (index: number) => {
    const newNarratives = formData.narratives.filter((_, i) => i !== index);
    setFormData({ ...formData, narratives: newNarratives });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Humanitarian Scope</DialogTitle>
          <DialogDescription>
            Link this activity to a specific emergency or appeal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <HumanitarianTypeSelect
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as '1' | '2' })}
              placeholder="Select type..."
            />
          </div>

          <div className="space-y-2">
            <Label>Vocabulary <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <HumanitarianVocabularySelect
              value={formData.vocabulary}
              onValueChange={(value) => {
                const updates: Partial<HumanitarianScope> = { vocabulary: value };
                if (value === '98') {
                  updates.code = '';
                }
                setFormData({ ...formData, ...updates });
              }}
              placeholder="Select vocabulary..."
            />
          </div>

          <div className="space-y-2">
            <Label>Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            {formData.vocabulary === '98' ? (
              <EmergencySearchableSelect
                value={formData.code}
                onValueChange={(code) => setFormData({ ...formData, code })}
                placeholder="Select a country emergency..."
              />
            ) : (
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., EQ-2015-000048-NPL or FNPL15"
              />
            )}
          </div>

          {formData.vocabulary === '99' && (
            <div className="space-y-2">
              <Label>Vocabulary URI</Label>
              <Input
                value={formData.vocabulary_uri || ''}
                onChange={(e) => setFormData({ ...formData, vocabulary_uri: e.target.value })}
                placeholder="https://example.org/vocabularies/emergencies"
              />
              <p className="text-xs text-gray-500">URL to your custom vocabulary documentation</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Response Description <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            {formData.narratives.map((narrative, index) => (
              <div key={index} className="space-y-2">
                <Textarea
                  value={narrative.narrative}
                  onChange={(e) => updateNarrative(index, 'narrative', e.target.value)}
                  placeholder="Describe how this activity responds to or addresses the emergency..."
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <LanguageSelect
                      value={narrative.language}
                      onValueChange={(value) => updateNarrative(index, 'language', value)}
                      placeholder="Select language..."
                    />
                  </div>
                  {formData.narratives.length > 1 && (
                    <Button
                      onClick={() => removeNarrative(index)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  <Button onClick={addNarrative} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Language
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-black hover:bg-gray-800 text-white">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
