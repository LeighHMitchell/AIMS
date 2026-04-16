"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
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
import { Plus, Trash2, Pencil, AlertCircle, Heart, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { HumanitarianScope } from '@/types/humanitarian';
import { CountryEmergency } from '@/types/country-emergency';
import {
  getScopeTypeName,
  getVocabularyName
} from '@/data/humanitarian-codelists';
import { formatLanguageDisplay } from '@/data/language-codes';
import { HumanitarianScopeModal } from '@/components/modals/HumanitarianScopeModal';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<HumanitarianScope | null>(null);
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
    if (emergency.startDate) parts.push(format(new Date(emergency.startDate), 'd MMMM yyyy'));
    if (emergency.endDate) parts.push(format(new Date(emergency.endDate), 'd MMMM yyyy'));
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
    setEditingScope(null);
    setModalOpen(true);
  };

  const handleEditScope = (scope: HumanitarianScope) => {
    setEditingScope(scope);
    setModalOpen(true);
  };

  const handleSaveScope = async (scope: HumanitarianScope) => {
    let newScopes: HumanitarianScope[];
    if (scope.id) {
      newScopes = scopes.map(s => s.id === scope.id ? scope : s);
    } else {
      newScopes = [...scopes, scope];
    }

    setScopes(newScopes);
    await saveHumanitarianData(humanitarian, newScopes);
  };

  const handleDeleteScope = async (scopeId?: string) => {
    const newScopes = scopes.filter(s => s.id !== scopeId);
    setScopes(newScopes);
    await saveHumanitarianData(humanitarian, newScopes);
    toast.success('Humanitarian scope deleted');
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
      {/*
        Humanitarian flag — a metadata marker, not a warning. Dropped the
        border-red-300 / text-red-* / bg-red-600 styling that dressed this
        section like an error zone. A single <Heart /> icon at the heading
        carries the thematic cue; the active-state Switch keeps a calm red
        tint via accent tokens.
      */}
      <div className="relative border border-border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {/*
                Single save indicator only — LabelSaveIndicator renders the
                spinner/tick inline after the label. The previous markup had a
                second standalone SaveIndicator right after the HelpTextTooltip
                which produced an orange circle on BOTH sides of the (?) during
                save. `hasValue={humanitarian}` makes the green tick confirm the
                ON state after a save, rather than being permanently suppressed.
              */}
              <LabelSaveIndicator
                isSaving={isSaving}
                isSaved={!isLoading && activityId !== 'NEW'}
                hasValue={humanitarian}
                className="text-sm font-medium cursor-pointer text-foreground"
              >
                Humanitarian Activity
              </LabelSaveIndicator>
              <HelpTextTooltip content="Mark this activity as humanitarian if it relates entirely or partially to humanitarian aid. This follows IATI Standard guidance for humanitarian reporting." />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Identify if this activity is for emergency response or disaster relief
            </p>
            <Switch
              id="humanitarian-toggle"
              checked={humanitarian}
              onCheckedChange={handleHumanitarianToggle}
              disabled={readOnly || isSaving || activityId === 'NEW'}
              className="mt-3"
            />
          </div>
          {humanitarian && !readOnly && activityId !== 'NEW' && (
            <Button onClick={handleAddScope} size="sm" disabled={isSaving}>
              <Plus className="h-4 w-4 mr-2" />
              Add Emergency / Appeal
            </Button>
          )}
        </div>

        {activityId === 'NEW' && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please create the activity first by adding a title in the Overview tab.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Humanitarian Scope Section */}
      {humanitarian && activityId !== 'NEW' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Emergencies & Appeals
              <HelpTextTooltip content="Identify specific emergencies (using GLIDE codes) or appeals (using UN OCHA HRP codes) that this activity responds to. Multiple entries can be added." />
            </CardTitle>
            <CardDescription>
              Link to specific emergencies or appeals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scopes.length === 0 && (
              <div className="text-center py-12">
                <img src="/images/empty-pallet.png" alt="No humanitarian scopes" className="h-32 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No emergencies or appeals</h3>
                <p className="text-muted-foreground">
                  Use the button above to link to a specific emergency or appeal.
                </p>
              </div>
            )}

            {scopes.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Vocabulary</TableHead>
                      <TableHead className="whitespace-nowrap">Emergency/Appeal</TableHead>
                      <TableHead className="whitespace-nowrap">Location</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scopes.map((scope) => (
                      <TableRow key={scope.id}>
                        <TableCell className="text-sm align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {scope.id && (
                              <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))] flex-shrink-0" />
                            )}
                            {getScopeTypeName(scope.type)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm align-top whitespace-nowrap">
                          <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{scope.vocabulary}</code>{' '}
                          {getVocabularyName(scope.vocabulary)}
                        </TableCell>
                        <TableCell className="align-top">
                          {scope.vocabulary === '98' && emergencyMap[scope.code] ? (
                            <div className="text-sm">
                              <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                                {scope.code}
                              </code>{' '}
                              {emergencyMap[scope.code].name}
                            </div>
                          ) : scope.vocabulary_uri ? (
                            <a
                              href={scope.vocabulary_uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <code className="px-2 py-1 bg-muted rounded text-sm font-mono text-blue-600 hover:bg-gray-200 cursor-pointer transition-colors whitespace-nowrap">
                                {scope.code}
                              </code>
                            </a>
                          ) : (
                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono whitespace-nowrap">
                              {scope.code}
                            </code>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-sm">
                          {scope.vocabulary === '98' && emergencyMap[scope.code]?.location ? (
                            <span>{emergencyMap[scope.code].location}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-sm whitespace-nowrap">
                          {scope.vocabulary === '98' && emergencyMap[scope.code] && formatEmergencyDateRange(emergencyMap[scope.code]) ? (
                            <span>{formatEmergencyDateRange(emergencyMap[scope.code])}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="align-top">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditScope(scope)}
                                disabled={isSaving}
                                className="p-1.5 rounded hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteScope(scope.id)}
                                disabled={isSaving}
                                className="p-1.5 rounded hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <HumanitarianScopeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveScope}
        editingScope={editingScope}
      />
    </div>
  );
}

export default HumanitarianTab;
