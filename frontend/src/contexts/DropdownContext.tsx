"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface DropdownContextType {
  openDropdown: string | null;
  setOpenDropdown: (dropdownId: string | null) => void;
  closeAllDropdowns: () => void;
  isDropdownOpen: (dropdownId: string) => boolean;
  openDropdownExclusive: (dropdownId: string) => void;
}

export const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function DropdownProvider({ children }: { children: React.ReactNode }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  const isDropdownOpen = useCallback((dropdownId: string) => {
    return openDropdown === dropdownId;
  }, [openDropdown]);

  const openDropdownExclusive = useCallback((dropdownId: string) => {
    setOpenDropdown(dropdownId);
  }, []);

  const value: DropdownContextType = {
    openDropdown,
    setOpenDropdown,
    closeAllDropdowns,
    isDropdownOpen,
    openDropdownExclusive,
  };

  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
}

export function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (context === undefined) {
    throw new Error('useDropdownContext must be used within a DropdownProvider');
  }
  return context;
}

// Optional version that returns null if no provider
export function useDropdownContextOptional() {
  return useContext(DropdownContext);
}

// Hook for individual dropdowns to manage their state
// Falls back to local state if no DropdownProvider is present
export function useDropdownState(dropdownId: string) {
  const context = useDropdownContextOptional();
  const [localOpen, setLocalOpen] = useState(false);

  // If we have context, use shared state
  const isOpen = context ? context.isDropdownOpen(dropdownId) : localOpen;

  const setOpen = useCallback((open: boolean) => {
    if (context) {
      if (open) {
        context.openDropdownExclusive(dropdownId);
      } else {
        context.setOpenDropdown(null);
      }
    } else {
      setLocalOpen(open);
    }
  }, [context, dropdownId]);

  return { isOpen, setOpen };
}
