'use client';

import { RequiredDot } from "@/components/ui/required-dot";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Link2, X } from 'lucide-react';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useReferences } from '@/hooks/use-results';
import { toast } from 'sonner';
import { ResultReference, REFERENCE_VOCABULARIES } from '@/types/results';

interface ReferencesManagerProps {
  entityType: 'result' | 'indicator';
  entityId: string;
  references: ResultReference[];
  onUpdate: () => void;
  readOnly?: boolean;
}

export function ReferencesManager({
  entityType,
  entityId,
  references = [],
  onUpdate,
  readOnly = false
}: ReferencesManagerProps) {
  const { createReference, deleteReference, loading } = useReferences();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    vocabulary: '99', // Default to Reporting Organisation
    code: '',
    vocabulary_uri: '',
    indicator_uri: '' // Only for indicators
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vocabulary || !formData.code) {
      return;
    }

      const success = await createReference(entityType, entityId, formData);
    
    if (success) {
      setFormData({
        vocabulary: '99', // Reset to default
        code: '',
        vocabulary_uri: '',
        indicator_uri: ''
      });
      setShowAddForm(false);
      onUpdate();
    }
  };

  const handleDelete = async (referenceId: string) => {
    const deleted = references.find(r => r.id === referenceId);
    if (await confirm({ title: 'Delete this reference?', description: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Keep' })) {
      const success = await deleteReference(entityType, entityId, referenceId);
      if (success) {
        onUpdate();
        toast('Reference deleted', {
          action: {
            label: 'Undo',
            onClick: async () => {
              if (deleted) {
                await createReference(entityType, entityId, { vocabulary: deleted.vocabulary, code: deleted.code, indicator_uri: deleted.indicator_uri });
                onUpdate();
              }
            }
          }
        });
      }
    }
  };

  const getVocabularyLabel = (vocab: string) => {
    return REFERENCE_VOCABULARIES[vocab as keyof typeof REFERENCE_VOCABULARIES] || vocab;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-body font-medium text-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          External References
        </Label>
        {!readOnly && !showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="text-helper"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Reference
          </Button>
        )}
      </div>

      {/* Add Reference Form */}
      {showAddForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-muted p-4 rounded border space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-body font-medium text-foreground">Add External Reference</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-helper text-foreground">Result Vocabulary <RequiredDot /></Label>
            <Select
              value={formData.vocabulary}
              onValueChange={(value) => setFormData(prev => ({ ...prev, vocabulary: value }))}
            >
              <SelectTrigger className="text-body">
                <SelectValue placeholder="Select result vocabulary" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REFERENCE_VOCABULARIES).map(([code, label]) => (
                  <SelectItem key={code} value={code} className="text-body">
                    {code} - {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-helper text-foreground">Code <RequiredDot /></Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="Enter code"
              required
              className="text-body"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-helper text-foreground">Vocabulary URI</Label>
            <Input
              type="url"
              value={formData.vocabulary_uri}
              onChange={(e) => setFormData(prev => ({ ...prev, vocabulary_uri: e.target.value }))}
              placeholder="https://example.com/vocabulary"
              className="text-body"
            />
          </div>

          {entityType === 'indicator' && (
            <div className="space-y-2">
              <Label className="text-helper text-foreground">Indicator URI</Label>
              <Input
                type="url"
                value={formData.indicator_uri}
                onChange={(e) => setFormData(prev => ({ ...prev, indicator_uri: e.target.value }))}
                placeholder="https://example.com/indicator"
                className="text-body"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !formData.vocabulary || !formData.code}
              className="bg-muted hover:bg-gray-300 text-foreground border border-gray-400"
            >
              Add Reference
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* References List */}
      {references.length > 0 && (
        <div className="space-y-2">
          {references.map((ref) => (
            <div key={ref.id} className="flex items-center justify-between bg-white p-3 rounded border text-body">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {ref.vocabulary}
                    </span>
                    <span className="font-medium text-foreground">
                      - {getVocabularyLabel(ref.vocabulary)}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {ref.code}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 ml-6 text-helper text-muted-foreground">
                  {ref.vocabulary_uri && (
                    <a
                      href={ref.vocabulary_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Vocabulary URI
                    </a>
                  )}
                  
                  {ref.indicator_uri && (
                    <a
                      href={ref.indicator_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Indicator URI
                    </a>
                  )}
                </div>
              </div>
              
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(ref.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {references.length === 0 && !showAddForm && (
        <p className="text-helper text-muted-foreground italic">No external references</p>
      )}
      <ConfirmDialog />
    </div>
  );
}

