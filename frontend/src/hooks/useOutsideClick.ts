import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook that detects clicks outside of the referenced element
 * @param callback Function to call when outside click is detected
 * @param isActive Optional boolean to enable/disable the listener (default: true)
 * @returns RefObject to attach to the element
 */
export function useOutsideClick<T extends HTMLElement = HTMLDivElement>(
  callback: () => void,
  isActive: boolean = true
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
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
  }, [callback, isActive]);

  return ref;
} 