import { useState, useCallback } from 'react';

interface UseLoadingStateOptions {
  initialLoading?: boolean;
  minimumLoadingTime?: number;
}

export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const { initialLoading = true, minimumLoadingTime = 300 } = options;
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [startTime, setStartTime] = useState<number | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setStartTime(Date.now());
  }, []);

  const stopLoading = useCallback(async () => {
    if (startTime && minimumLoadingTime > 0) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = minimumLoadingTime - elapsedTime;
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    }
    
    setIsLoading(false);
    setStartTime(null);
  }, [startTime, minimumLoadingTime]);

  const withLoading = useCallback(
    async <T,>(asyncFunction: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await asyncFunction();
        await stopLoading();
        return result;
      } catch (error) {
        await stopLoading();
        throw error;
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
} 