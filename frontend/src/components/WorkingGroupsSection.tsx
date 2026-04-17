"use client";

import React, { useState } from 'react';
import { Users, Trash2, LayoutGrid, List } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardShell } from '@/components/ui/card-shell';
import { toast } from 'sonner';
import { WORKING_GROUPS } from '@/lib/workingGroups';
import { WorkingGroupsSearchableSelect } from '@/components/forms/WorkingGroupsSearchableSelect';
import { useWorkingGroupsAutosave } from '@/hooks/use-working-groups-autosave';
import { useUser } from '@/hooks/useUser';

const BANNER_COUNT = 8;
function getDefaultBanner(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = (Math.abs(hash) % BANNER_COUNT) + 1;
  return `/images/working-groups/banner-${index}.svg`;
}

interface WorkingGroupMapping {
  code: string;
  label: string;
  vocabulary: string;
}

interface WorkingGroupsSectionProps {
  activityId?: string;
  workingGroups: WorkingGroupMapping[];
  onChange: (workingGroups: WorkingGroupMapping[]) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}

export default function WorkingGroupsSection({ activityId, workingGroups, onChange, setHasUnsavedChanges }: WorkingGroupsSectionProps) {
  const { user } = useUser();
  const selectedCodes = workingGroups.map(wg => wg.code);
  const workingGroupsAutosave = useWorkingGroupsAutosave(activityId, user?.id);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const handleWorkingGroupsChange = (codes: string[]) => {
    const mappings: WorkingGroupMapping[] = codes.map(code => {
      const wg = WORKING_GROUPS.find(w => w.code === code)!;
      return {
        code: wg.code,
        label: wg.label,
        vocabulary: "99"
      };
    });

    onChange(mappings);
    setHasUnsavedChanges?.(true);

    if (activityId && user?.id) {
      workingGroupsAutosave.triggerFieldSave(mappings);
    }

    if (codes.length > selectedCodes.length) {
      const addedCode = codes.find(code => !selectedCodes.includes(code));
      const addedGroup = WORKING_GROUPS.find(wg => wg.code === addedCode);
      if (addedGroup) {
        toast.success(`Activity added to ${addedGroup.label}`);
      }
    } else if (codes.length < selectedCodes.length) {
      const removedCode = selectedCodes.find(code => !codes.includes(code));
      const removedGroup = WORKING_GROUPS.find(wg => wg.code === removedCode);
      if (removedGroup) {
        toast.success(`Activity removed from ${removedGroup.label}`);
      }
    }
  };

  const removeWorkingGroup = (code: string) => {
    const newCodes = selectedCodes.filter(c => c !== code);
    handleWorkingGroupsChange(newCodes);
  };

  const selectedGroups = selectedCodes
    .map(code => WORKING_GROUPS.find(w => w.code === code))
    .filter((wg): wg is NonNullable<typeof wg> => !!wg);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-8 space-y-6">
      <div className="space-y-4">
        <Label htmlFor="working-groups">Add this activity to relevant working groups</Label>
        <WorkingGroupsSearchableSelect
          value={selectedCodes}
          onValueChange={handleWorkingGroupsChange}
          placeholder="Select working groups..."
          disabled={false}
        />
      </div>

      {selectedGroups.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <div className="flex items-center border rounded-md flex-shrink-0">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-r-none h-9"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-l-none h-9"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="rounded-md border w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Working Group</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead style={{ width: '70px' }} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGroups.map((wg) => (
                    <TableRow key={wg.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{wg.label}</span>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {wg.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {wg.description ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">{wg.description}</p>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeWorkingGroup(wg.code)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove ${wg.label}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedGroups.map((wg) => (
                <CardShell
                  key={wg.code}
                  ariaLabel={`Working Group: ${wg.label}`}
                  bannerContent={
                    <img
                      src={getDefaultBanner(wg.code)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  }
                  bannerOverlay={
                    <h2 className="text-lg font-bold text-white mb-1 drop-shadow-md">
                      {wg.label}{' '}
                      <span className="text-xs font-mono font-normal bg-white/20 text-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap align-middle">
                        {wg.code}
                      </span>
                    </h2>
                  }
                >
                  <div className="relative flex-1 p-5 flex flex-col bg-card">
                    <div className="mb-3">
                      <Badge variant="success">Active</Badge>
                    </div>

                    {wg.description ? (
                      <p className="text-sm line-clamp-3 text-muted-foreground">
                        {wg.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 italic">No description</p>
                    )}

                    <div className="flex justify-end mt-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWorkingGroup(wg.code)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${wg.label}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardShell>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <img src="/images/empty-roundtable-chairs.webp" alt="No working groups" className="h-32 mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-medium mb-2">No working groups</h3>
          <p className="text-muted-foreground mb-4">
            Use the select above to add your first working group.
          </p>
        </div>
      )}
    </div>
  );
}
