"use client";

import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
  easing: "ease",
  speed: 300,
});

interface LoadingBarContextType {
  startLoading: () => void;
  stopLoading: () => void;
  isLoading: boolean;
}

const LoadingBarContext = createContext<LoadingBarContextType | undefined>(undefined);

export function LoadingBarProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingCountRef = useRef(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Start loading - supports multiple concurrent callers
  const startLoading = useCallback(() => {
    loadingCountRef.current += 1;
    if (loadingCountRef.current === 1) {
      setIsLoading(true);
      NProgress.start();
    }
  }, []);

  // Stop loading - only stops when all callers have finished
  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) {
      setIsLoading(false);
      NProgress.done();
    }
  }, []);

  // Listen to route changes
  useEffect(() => {
    // Route change completed - stop loading
    NProgress.done();
    loadingCountRef.current = 0;
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Handle link clicks for navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link) {
        const href = link.getAttribute("href");
        const isInternal = href && (href.startsWith("/") || href.startsWith("#"));
        const isSameOrigin = href && !href.startsWith("http");
        const isNewTab = link.target === "_blank";
        const hasModifier = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
        
        // Only show progress for internal navigation
        if (isInternal && isSameOrigin && !isNewTab && !hasModifier && href !== pathname) {
          NProgress.start();
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  return (
    <LoadingBarContext.Provider value={{ startLoading, stopLoading, isLoading }}>
      {children}
    </LoadingBarContext.Provider>
  );
}

export function useLoadingBar() {
  const context = useContext(LoadingBarContext);
  if (context === undefined) {
    throw new Error("useLoadingBar must be used within a LoadingBarProvider");
  }
  return context;
}







