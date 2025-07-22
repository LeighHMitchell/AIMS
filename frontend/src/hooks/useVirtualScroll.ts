import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollThreshold?: number;
}

interface VirtualScrollResult {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    size: number;
    offsetTop: number;
  }>;
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export function useVirtualScroll<T>(
  items: T[],
  options: UseVirtualScrollOptions
): VirtualScrollResult {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    scrollThreshold = 100,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total height
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const items: VirtualScrollResult['virtualItems'] = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        size: itemHeight,
        offsetTop: i * itemHeight,
      });
    }
    
    return items;
  }, [visibleRange.start, visibleRange.end, itemHeight]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    const newScrollTop = index * itemHeight;
    setScrollTop(newScrollTop);
    
    if (containerRef.current) {
      containerRef.current.scrollTop = newScrollTop;
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    setScrollTop(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    const newScrollTop = totalHeight - containerHeight;
    setScrollTop(newScrollTop);
    if (containerRef.current) {
      containerRef.current.scrollTop = newScrollTop;
    }
  }, [totalHeight, containerHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    containerRef,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  };
} 