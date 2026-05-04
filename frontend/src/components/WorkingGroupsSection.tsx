"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { WORKING_GROUPS } from '@/lib/workingGroups';
import { WorkingGroupsSearchableSelect } from '@/components/forms/WorkingGroupsSearchableSelect';
import { useWorkingGroupsAutosave } from '@/hooks/use-working-groups-autosave';
import { useUser } from '@/hooks/useUser';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

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
  const { confirm, ConfirmDialog } = useConfirmDialog();

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
          toast(`Activity removed from ${removedGroup.label}`, {
            action: {
              label: 'Undo',
              onClick: () => applyWorkingGroupsChange(previousCodes, { silent: true }),
            },
          });
        }
      } else if (removedCodes.length > 1) {
        const previousCodes = [...selectedCodes];
        toast(`Activity removed from ${removedCodes.length} working groups`, {
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
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: '80px' }}>Code</TableHead>
                  <TableHead>Working Group</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead style={{ width: '70px' }} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGroups.map((wg) => (
                  <TableRow key={wg.code}>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {wg.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-body">{wg.label}</span>
                    </TableCell>
                    <TableCell>
                      {wg.description ? (
                        <p className="text-body line-clamp-2">{wg.description}</p>
                      ) : (
                        <span className="text-helper text-muted-foreground/60">—</span>
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
          </TableContainer>
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
