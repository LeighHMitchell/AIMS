import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook that detects clicks outside of the referenced element
 * @param callback Function to call when outside click is detected
 * @param isActive Optional boolean to enable/disable the listener (default: true)
 * @param ref Optional ref to use. If not provided, will listen globally
 * @returns RefObject to attach to the element (if ref not provided)
 */
export function useOutsideClick<T extends HTMLElement = HTMLDivElement>(
  callback: () => void,
  isActive: boolean = true,
  ref?: RefObject<T>
): RefObject<T> | null {
  const internalRef = useRef<T>(null);
  const actualRef = ref || internalRef;

  useEffect(() => {
    if (!isActive) return;

    function handleClick(event: MouseEvent) {
      // If a specific ref is provided, check if click is outside that element
      // If no ref is provided, always trigger (global listener)
      if (actualRef.current) {
        if (!actualRef.current.contains(event.target as Node)) {
          callback();
        }
      } else {
        // Global listener - always trigger callback
        callback();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        callback();
      }
    }

    // Use 'mousedown' instead of 'click' to handle before other events
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [callback, isActive, actualRef]);

  return actualRef as RefObject<T>;
} 