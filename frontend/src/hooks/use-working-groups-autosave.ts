import { useFieldAutosave } from './use-field-autosave-new';

export function useWorkingGroupsAutosave(activityId: string | undefined, userId: string | undefined) {
  return useFieldAutosave('workingGroups', {
    activityId,
    userId,
    enabled: !!activityId && !!userId,
    debounceMs: 1000, // 1 second debounce for quick feedback
  });
} 