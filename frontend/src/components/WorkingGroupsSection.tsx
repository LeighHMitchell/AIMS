"use client";

import React, { useState } from 'react';
import { Users, Trash2, LayoutGrid, List, CheckSquare, Square } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCodesForBulk, setSelectedCodesForBulk] = useState<Set<string>>(new Set());
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const toggleBulkSelected = (code: string) => {
    setSelectedCodesForBulk(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedCodesForBulk(new Set());
  };

  const removeSelectedGroups = async () => {
    if (selectedCodesForBulk.size === 0) return;
    const count = selectedCodesForBulk.size;
    const ok = await confirm({
      title: `Remove ${count} working group${count === 1 ? '' : 's'}?`,
      description: `This activity will no longer be listed under the selected working group${count === 1 ? '' : 's'}. You can add them back anytime.`,
      confirmLabel: `Remove ${count}`,
      cancelLabel: 'Keep all',
      destructive: true,
    });
    if (!ok) return;
    const newCodes = selectedCodes.filter(c => !selectedCodesForBulk.has(c));
    exitSelectMode();
    applyWorkingGroupsChange(newCodes);
  };

  // Apply the codes list without confirmation (used internally after confirm passes)
  const applyWorkingGroupsChange = (codes: string[], options?: { silent?: boolean }) => {
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

    if (options?.silent) return;

    if (codes.length > selectedCodes.length) {
      const addedCode = codes.find(code => !selectedCodes.includes(code));
      const addedGroup = WORKING_GROUPS.find(wg => wg.code === addedCode);
      if (addedGroup) {
        toast.success(`Activity added to ${addedGroup.label}`);
      }
    } else if (codes.length < selectedCodes.length) {
      const removedCodes = selectedCodes.filter(code => !codes.includes(code));
      if (removedCodes.length === 1) {
        const removedGroup = WORKING_GROUPS.find(wg => wg.code === removedCodes[0]);
        if (removedGroup) {
          const previousCodes = [...selectedCodes];
          toast.success(`Activity removed from ${removedGroup.label}`, {
            action: {
              label: 'Undo',
              onClick: () => applyWorkingGroupsChange(previousCodes, { silent: true }),
            },
          });
        }
      } else if (removedCodes.length > 1) {
        const previousCodes = [...selectedCodes];
        toast.success(`Activity removed from ${removedCodes.length} working groups`, {
          action: {
            label: 'Undo',
            onClick: () => applyWorkingGroupsChange(previousCodes, { silent: true }),
          },
        });
      }
    }
  };

  const handleWorkingGroupsChange = async (codes: string[]) => {
    // Detect removal path (fewer codes than before) and confirm
    if (codes.length < selectedCodes.length) {
      const removedCodes = selectedCodes.filter(c => !codes.includes(c));
      const firstRemoved = WORKING_GROUPS.find(w => w.code === removedCodes[0]);
      const ok = await confirm({
        title: removedCodes.length === 1
          ? 'Remove this working group?'
          : `Remove ${removedCodes.length} working groups?`,
        description: removedCodes.length === 1 && firstRemoved
          ? `This activity will no longer be listed under "${firstRemoved.label}". You can add it back anytime.`
          : 'These working groups will be removed from the activity. You can add them back anytime.',
        confirmLabel: 'Remove',
        cancelLabel: 'Keep',
        destructive: true,
      });
      if (!ok) return;
    }
    applyWorkingGroupsChange(codes);
  };

  const removeWorkingGroup = async (code: string) => {
    const wg = WORKING_GROUPS.find(w => w.code === code);
    const ok = await confirm({
      title: 'Remove this working group?',
      description: wg
        ? `This activity will no longer be listed under "${wg.label}". You can add it back anytime.`
        : 'This activity will be removed from the selected working group.',
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (!ok) return;
    const newCodes = selectedCodes.filter(c => c !== code);
    applyWorkingGroupsChange(newCodes);
  };

  const selectedGroups = selectedCodes
    .map(code => WORKING_GROUPS.find(w => w.code === code))
    .filter((wg): wg is NonNullable<typeof wg> => !!wg);

  return (
    <div className="space-y-6">
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {selectMode ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedCodesForBulk.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={removeSelectedGroups}
                    disabled={selectedCodesForBulk.size === 0}
                  >
                    Remove selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={exitSelectMode}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectMode(true)}
                  className="gap-1.5"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select
                </Button>
              )}
            </div>
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
                    {selectMode && (
                      <TableHead style={{ width: '40px' }}>
                        <Checkbox
                          checked={selectedCodesForBulk.size === selectedGroups.length && selectedGroups.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCodesForBulk(new Set(selectedGroups.map(g => g.code)));
                            } else {
                              setSelectedCodesForBulk(new Set());
                            }
                          }}
                          aria-label="Select all working groups"
                        />
                      </TableHead>
                    )}
                    <TableHead>Working Group</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead style={{ width: '70px' }} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGroups.map((wg) => (
                    <TableRow
                      key={wg.code}
                      className={cn(selectMode && "cursor-pointer", selectMode && selectedCodesForBulk.has(wg.code) && "bg-muted/50")}
                      onClick={selectMode ? () => toggleBulkSelected(wg.code) : undefined}
                    >
                      {selectMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedCodesForBulk.has(wg.code)}
                            onCheckedChange={() => toggleBulkSelected(wg.code)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${wg.label}`}
                          />
                        </TableCell>
                      )}
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
                            onClick={(e) => { e.stopPropagation(); removeWorkingGroup(wg.code); }}
                            disabled={selectMode}
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
      <ConfirmDialog />
    </div>
  );
}
