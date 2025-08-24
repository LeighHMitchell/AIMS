import { useState, useRef, useCallback } from 'react';

/**
 * Hook that provides stable count management to prevent flickering during updates
 * Debounces count changes and maintains stable values during loading states
 */
export function useStableCount(initialCount = 0) {
  const [count, setCount] = useState(initialCount);
  const stableCount = useRef(initialCount);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateCount = useCallback((newCount: number, immediate = false) => {
    // Clear any pending update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (immediate) {
      // Update immediately for critical changes
      stableCount.current = newCount;
      setCount(newCount);
    } else {
      // Debounce updates to prevent flicker
      timeoutRef.current = setTimeout(() => {
        // Only update if the count has actually changed
        if (stableCount.current !== newCount) {
          stableCount.current = newCount;
          setCount(newCount);
        }
      }, 50); // Small delay to prevent flicker
    }
  }, []);

  const getCurrentCount = useCallback(() => {
    return stableCount.current;
  }, []);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    count,
    updateCount,
    getCurrentCount,
    cleanup
  };
}
