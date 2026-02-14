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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit2, Save, X, AlertCircle, Heart, CheckCircle2 } from 'lucide-react';
import { HumanitarianScope, HumanitarianScopeNarrative } from '@/types/humanitarian';
import { CountryEmergency } from '@/types/country-emergency';
import {
  HUMANITARIAN_SCOPE_TYPES,
  HUMANITARIAN_SCOPE_VOCABULARIES,
  getScopeTypeName,
  getVocabularyName
} from '@/data/humanitarian-codelists';
import { HumanitarianVocabularySelect } from '@/components/forms/HumanitarianVocabularySelect';
import { HumanitarianTypeSelect } from '@/components/forms/HumanitarianTypeSelect';
import { EmergencySearchableSelect } from '@/components/forms/EmergencySearchableSelect';
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
  const [emergencyMap, setEmergencyMap] = useState<Record<string, CountryEmergency>>({});

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
        const humanitarianValue = data.humanitarian || false;
        const scopesValue = data.humanitarian_scopes || [];
        setHumanitarian(humanitarianValue);
        setScopes(scopesValue);
        onDataChange?.({
          humanitarian: humanitarianValue,
          humanitarianScopes: scopesValue
        });
      }
    } catch (error) {
      console.error('Error fetching humanitarian data:', error);
      toast.error('Failed to load humanitarian data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch emergency details for vocab 98 scopes
  useEffect(() => {
    const hasVocab98 = scopes.some(s => s.vocabulary === '98');
    if (!hasVocab98) return;
    const fetchEmergencies = async () => {
      try {
        const response = await fetch('/api/emergencies');
        const data = await response.json();
        if (response.ok && data.data) {
          const map: Record<string, CountryEmergency> = {};
          data.data.forEach((e: CountryEmergency) => { map[e.code] = e; });
          setEmergencyMap(map);
        }
      } catch (error) {
        console.error('Error fetching emergencies for display:', error);
      }
    };
    fetchEmergencies();
  }, [scopes]);

  const formatEmergencyDateRange = (emergency: CountryEmergency) => {
    const parts: string[] = [];
    if (emergency.startDate) parts.push(new Date(emergency.startDate).toLocaleDateString());
    if (emergency.endDate) parts.push(new Date(emergency.endDate).toLocaleDateString());
    if (parts.length === 0) return null;
    return parts.join(' – ');
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
    <div className={`space-y-6 ${className}`}>
      {/* Humanitarian Flag Section - Fieldset Style with Label */}
      <div className="relative border-2 border-red-300 rounded-lg p-6 bg-red-50/30">
        {/* Label positioned on the border */}
        <div className="absolute -top-3 left-4 px-2 bg-white">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span className="text-sm font-semibold text-red-700">Humanitarian</span>
          </div>
        </div>

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
          <Switch
            id="humanitarian-toggle"
            checked={humanitarian}
            onCheckedChange={handleHumanitarianToggle}
            disabled={readOnly || isSaving || activityId === 'NEW'}
            className="mt-3 data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-red-200"
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
      </div>

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

            {scopes.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Vocabulary</TableHead>
                      <TableHead className="whitespace-nowrap">Code</TableHead>
                      <TableHead className="whitespace-nowrap">Location</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead>Response Description</TableHead>
                      {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scopes.map((scope) => (
                      <TableRow key={scope.id}>
                        <TableCell className="font-medium align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {scope.id && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            {getScopeTypeName(scope.type)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 align-top whitespace-nowrap">
                          {getVocabularyName(scope.vocabulary)}
                        </TableCell>
                        <TableCell className="align-top">
                          {scope.vocabulary === '98' && emergencyMap[scope.code] ? (
                            <div className="space-y-1">
                              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono whitespace-nowrap">
                                {scope.code}
                              </code>
                              <div className="text-sm font-medium text-gray-900">
                                {emergencyMap[scope.code].name}
                              </div>
                            </div>
                          ) : scope.vocabulary_uri ? (
                            <a
                              href={scope.vocabulary_uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-blue-600 hover:bg-gray-200 cursor-pointer transition-colors whitespace-nowrap">
                                {scope.code}
                              </code>
                            </a>
                          ) : (
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono whitespace-nowrap">
                              {scope.code}
                            </code>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-sm text-gray-600">
                          {scope.vocabulary === '98' && emergencyMap[scope.code]?.location ? (
                            <span>{emergencyMap[scope.code].location}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-sm text-gray-600 whitespace-nowrap">
                          {scope.vocabulary === '98' && emergencyMap[scope.code] && formatEmergencyDateRange(emergencyMap[scope.code]) ? (
                            <span>{formatEmergencyDateRange(emergencyMap[scope.code])}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            {scope.narratives.map((narrative, idx) => (
                              <div key={idx} className="text-sm">
                                {scope.narratives.length > 1 && (
                                  <span className="font-medium text-gray-600">
                                    {formatLanguageDisplay(narrative.language)}:
                                  </span>
                                )}{' '}
                                <span className="text-gray-700">{narrative.narrative}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="align-top">
                            <div className="flex gap-1">
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
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Edit/Add Form */}
            {editingScope && (
              <div className="border rounded-lg p-4 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{isAddingNew ? 'Add' : 'Edit'} Humanitarian Scope</h3>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveScope} size="sm" disabled={isSaving} className="bg-black hover:bg-gray-800 text-white">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm" disabled={isSaving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope-type">Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                    <HumanitarianTypeSelect
                      value={editingScope.type}
                      onValueChange={(value) => setEditingScope({ ...editingScope, type: value as '1' | '2' })}
                      placeholder="Select type..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scope-vocabulary">Vocabulary <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                    <HumanitarianVocabularySelect
                      value={editingScope.vocabulary}
                      onValueChange={(value) => {
                        const updates: Partial<typeof editingScope> = { vocabulary: value };
                        if (value === '98') {
                          updates.code = '';
                        }
                        setEditingScope({ ...editingScope, ...updates });
                      }}
                      placeholder="Select vocabulary..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scope-code">Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                    {editingScope.vocabulary === '98' ? (
                      <EmergencySearchableSelect
                        value={editingScope.code}
                        onValueChange={(code) => {
                          setEditingScope({ ...editingScope, code });
                        }}
                        placeholder="Select a country emergency..."
                      />
                    ) : (
                      <Input
                        id="scope-code"
                        value={editingScope.code}
                        onChange={(e) => setEditingScope({ ...editingScope, code: e.target.value })}
                        placeholder="e.g., EQ-2015-000048-NPL or FNPL15"
                      />
                    )}
                  </div>
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
                    <Label>Response Description <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /> (at least one required)</Label>
                    <Button onClick={addNarrative} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Language
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Describe how this activity responds to or addresses the emergency</p>

                  {editingScope.narratives.map((narrative, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="w-52">
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
                          placeholder="e.g., Providing emergency shelter materials and food assistance to affected communities"
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

