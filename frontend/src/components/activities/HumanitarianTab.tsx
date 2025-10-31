"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Edit2, Save, X, AlertCircle, Heart } from 'lucide-react';
import { HumanitarianScope, HumanitarianScopeNarrative } from '@/types/humanitarian';
import { 
  HUMANITARIAN_SCOPE_TYPES, 
  HUMANITARIAN_SCOPE_VOCABULARIES,
  getScopeTypeName,
  getVocabularyName 
} from '@/data/humanitarian-codelists';
import { HumanitarianVocabularySelect } from '@/components/forms/HumanitarianVocabularySelect';
import { HumanitarianTypeSelect } from '@/components/forms/HumanitarianTypeSelect';
import { LanguageSelect } from '@/components/forms/LanguageSelect';
import { formatLanguageDisplay } from '@/data/language-codes';
import { toast } from 'sonner';

interface HumanitarianTabProps {
  activityId: string;
  readOnly?: boolean;
  onHumanitarianChange?: (humanitarian: boolean) => void;
  onDataChange?: (data: { humanitarian: boolean; humanitarianScopes: any[] }) => void;
  className?: string;
}

export function HumanitarianTab({ 
  activityId, 
  readOnly = false,
  onHumanitarianChange,
  onDataChange,
  className 
}: HumanitarianTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [humanitarian, setHumanitarian] = useState(false);
  const [scopes, setScopes] = useState<HumanitarianScope[]>([]);
  const [editingScope, setEditingScope] = useState<HumanitarianScope | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Fetch humanitarian data
  useEffect(() => {
    if (activityId && activityId !== 'NEW') {
      fetchHumanitarianData();
    } else {
      setIsLoading(false);
    }
  }, [activityId]);

  const fetchHumanitarianData = async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}/humanitarian`);
      if (response.ok) {
        const data = await response.json();
        setHumanitarian(data.humanitarian || false);
        setScopes(data.humanitarian_scopes || []);
      }
    } catch (error) {
      console.error('Error fetching humanitarian data:', error);
      toast.error('Failed to load humanitarian data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveHumanitarianData = async (newHumanitarian?: boolean, newScopes?: HumanitarianScope[]) => {
    if (!activityId || activityId === 'NEW') {
      toast.error('Please create the activity first');
      return;
    }

    setIsSaving(true);
    try {
      const humanitarianValue = newHumanitarian !== undefined ? newHumanitarian : humanitarian;
      const scopesValue = newScopes || scopes;
      
      const response = await fetch(`/api/activities/${activityId}/humanitarian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          humanitarian: humanitarianValue,
          humanitarian_scopes: scopesValue
        })
      });

      if (response.ok) {
        toast.success('Humanitarian data saved');
        await fetchHumanitarianData();
        
        // Notify parent component of the data change
        onDataChange?.({
          humanitarian: humanitarianValue,
          humanitarianScopes: scopesValue
        });
      } else {
        toast.error('Failed to save humanitarian data');
      }
    } catch (error) {
      console.error('Error saving humanitarian data:', error);
      toast.error('Failed to save humanitarian data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHumanitarianToggle = async (checked: boolean) => {
    setHumanitarian(checked);
    onHumanitarianChange?.(checked);
    await saveHumanitarianData(checked, scopes);
  };

  const handleAddScope = () => {
    setEditingScope({
      type: '1',
      vocabulary: '1-2',
      code: '',
      vocabulary_uri: '',
      narratives: [{ language: 'en', narrative: '' }]
    });
    setIsAddingNew(true);
  };

  const handleEditScope = (scope: HumanitarianScope) => {
    setEditingScope({ ...scope });
    setIsAddingNew(false);
  };

  const handleSaveScope = async () => {
    if (!editingScope) return;

    // Validation
    if (!editingScope.code.trim()) {
      toast.error('Code is required');
      return;
    }
    if (!editingScope.narratives.some(n => n.narrative.trim())) {
      toast.error('At least one narrative is required');
      return;
    }

    // Filter out empty narratives
    const cleanedScope = {
      ...editingScope,
      narratives: editingScope.narratives.filter(n => n.narrative.trim())
    };

    let newScopes: HumanitarianScope[];
    if (isAddingNew) {
      newScopes = [...scopes, cleanedScope];
    } else {
      newScopes = scopes.map(s => s.id === editingScope.id ? cleanedScope : s);
    }

    setScopes(newScopes);
    await saveHumanitarianData(humanitarian, newScopes);
    setEditingScope(null);
    setIsAddingNew(false);
  };

  const handleDeleteScope = async (scopeId?: string) => {
    const newScopes = scopes.filter(s => s.id !== scopeId);
    setScopes(newScopes);
    await saveHumanitarianData(humanitarian, newScopes);
    toast.success('Humanitarian scope deleted');
  };

  const handleCancelEdit = () => {
    setEditingScope(null);
    setIsAddingNew(false);
  };

  const addNarrative = () => {
    if (!editingScope) return;
    setEditingScope({
      ...editingScope,
      narratives: [...editingScope.narratives, { language: 'en', narrative: '' }]
    });
  };

  const updateNarrative = (index: number, field: 'language' | 'narrative', value: string) => {
    if (!editingScope) return;
    const newNarratives = [...editingScope.narratives];
    newNarratives[index] = { ...newNarratives[index], [field]: value };
    setEditingScope({ ...editingScope, narratives: newNarratives });
  };

  const removeNarrative = (index: number) => {
    if (!editingScope) return;
    const newNarratives = editingScope.narratives.filter((_, i) => i !== index);
    setEditingScope({ ...editingScope, narratives: newNarratives });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Humanitarian Flag Section - Red Card Styling */}
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              <div>
                <div className="flex items-center gap-2">
                  <Label 
                    htmlFor="humanitarian-toggle" 
                    className="text-sm font-medium cursor-pointer text-red-900"
                  >
                    Humanitarian Activity
                  </Label>
                  <HelpTextTooltip content="Mark this activity as humanitarian if it relates entirely or partially to humanitarian aid. This follows IATI Standard guidance for humanitarian reporting." />
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Identify if this activity is for emergency response or disaster relief
                </p>
              </div>
            </div>
            <Switch
              id="humanitarian-toggle"
              checked={humanitarian}
              onCheckedChange={handleHumanitarianToggle}
              disabled={readOnly || isSaving || activityId === 'NEW'}
              className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-red-200"
            />
          </div>
          
          {activityId === 'NEW' && (
            <Alert className="mt-4 border-red-300 bg-red-100/50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Please create the activity first by adding a title in the General tab.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Humanitarian Scope Section */}
      {humanitarian && activityId !== 'NEW' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  Humanitarian Scope
                  <HelpTextTooltip content="Identify specific emergencies (using GLIDE codes) or appeals (using UN OCHA HRP codes) that this activity responds to. Multiple entries can be added." />
                </CardTitle>
                <CardDescription>
                  Link to specific emergencies or appeals (optional but recommended)
                </CardDescription>
              </div>
              {!readOnly && !editingScope && (
                <Button onClick={handleAddScope} size="sm" disabled={isSaving}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scope
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Scopes */}
            {scopes.length === 0 && !editingScope && (
              <div className="text-center py-8 text-gray-500">
                No humanitarian scopes defined. Click "Add Scope" to link to a specific emergency or appeal.
              </div>
            )}

            {scopes.map((scope) => (
              <div key={scope.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{getScopeTypeName(scope.type)}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{getVocabularyName(scope.vocabulary)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Code:</span> {scope.code}
                    </div>
                    {scope.vocabulary_uri && (
                      <div className="text-sm">
                        <span className="font-medium">Vocabulary URI:</span>{' '}
                        <a href={scope.vocabulary_uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {scope.vocabulary_uri}
                        </a>
                      </div>
                    )}
                    <div className="mt-2 space-y-1">
                      {scope.narratives.map((narrative, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{formatLanguageDisplay(narrative.language)}:</span>{' '}
                          <span className="text-gray-700">{narrative.narrative}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditScope(scope)}
                        disabled={isSaving || editingScope !== null}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteScope(scope.id)}
                        disabled={isSaving || editingScope !== null}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Edit/Add Form */}
            {editingScope && (
              <div className="border-2 border-red-300 rounded-lg p-4 space-y-4 bg-red-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-red-900">{isAddingNew ? 'Add' : 'Edit'} Humanitarian Scope</h3>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveScope} size="sm" disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm" disabled={isSaving} className="border-red-300 text-red-700 hover:bg-red-50">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope-type">Type *</Label>
                    <HumanitarianTypeSelect
                      value={editingScope.type}
                      onValueChange={(value) => setEditingScope({ ...editingScope, type: value as '1' | '2' })}
                      placeholder="Select type..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scope-vocabulary">Vocabulary *</Label>
                    <HumanitarianVocabularySelect
                      value={editingScope.vocabulary}
                      onValueChange={(value) => setEditingScope({ ...editingScope, vocabulary: value })}
                      placeholder="Select vocabulary..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope-code">Code *</Label>
                  <Input
                    id="scope-code"
                    value={editingScope.code}
                    onChange={(e) => setEditingScope({ ...editingScope, code: e.target.value })}
                    placeholder="e.g., EQ-2015-000048-NPL or FNPL15"
                  />
                  <p className="text-xs text-gray-500">
                    {editingScope.vocabulary === '1-2' && 'Enter GLIDE number (e.g., EQ-2015-000048-NPL)'}
                    {editingScope.vocabulary === '2-1' && 'Enter UN OCHA HRP plan code (e.g., FNPL15)'}
                    {editingScope.vocabulary === '99' && 'Enter your organization\'s code'}
                  </p>
                </div>

                {editingScope.vocabulary === '99' && (
                  <div className="space-y-2">
                    <Label htmlFor="scope-uri">Vocabulary URI</Label>
                    <Input
                      id="scope-uri"
                      value={editingScope.vocabulary_uri || ''}
                      onChange={(e) => setEditingScope({ ...editingScope, vocabulary_uri: e.target.value })}
                      placeholder="https://example.org/vocabularies/emergencies"
                    />
                    <p className="text-xs text-gray-500">URL to your custom vocabulary documentation</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Narratives * (at least one required)</Label>
                    <Button onClick={addNarrative} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Language
                    </Button>
                  </div>
                  
                  {editingScope.narratives.map((narrative, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="w-40">
                        <LanguageSelect
                          value={narrative.language}
                          onValueChange={(value) => updateNarrative(index, 'language', value)}
                          placeholder="Select language..."
                        />
                      </div>
                      <div className="flex-1">
                        <Textarea
                          value={narrative.narrative}
                          onChange={(e) => updateNarrative(index, 'narrative', e.target.value)}
                          placeholder="Description of the emergency or appeal"
                          rows={2}
                        />
                      </div>
                      {editingScope.narratives.length > 1 && (
                        <Button
                          onClick={() => removeNarrative(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HumanitarianTab;

