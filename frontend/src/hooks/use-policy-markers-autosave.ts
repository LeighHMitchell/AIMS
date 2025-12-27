import { useFieldAutosave } from './use-field-autosave-new';
import { toast } from 'sonner';

export function usePolicyMarkersAutosave(activityId: string | undefined, userId: string | undefined) {
  return useFieldAutosave('policyMarkers', {
    activityId,
    userId,
    enabled: !!activityId && !!userId,
    debounceMs: 1000, // 1 second debounce for quick feedback
    onSuccess: (data: any) => {
      toast.success('Policy markers saved', { position: 'top-center' });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save policy markers: ${error.message}`, { position: 'top-center' });
    }
  });
}