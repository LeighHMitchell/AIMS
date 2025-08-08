"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface DropdownContextType {
  openDropdown: string | null;
  setOpenDropdown: (dropdownId: string | null) => void;
  closeAllDropdowns: () => void;
  isDropdownOpen: (dropdownId: string) => boolean;
  openDropdownExclusive: (dropdownId: string) => void;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

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

// Hook for individual dropdowns to manage their state
export function useDropdownState(dropdownId: string) {
  const { openDropdown, setOpenDropdown, isDropdownOpen, openDropdownExclusive } = useDropdownContext();
  
  const isOpen = isDropdownOpen(dropdownId);
  
  const setOpen = useCallback((open: boolean) => {
    if (open) {
      openDropdownExclusive(dropdownId);
    } else {
      setOpenDropdown(null);
    }
  }, [dropdownId, openDropdownExclusive, setOpenDropdown]);

  return { isOpen, setOpen };
}
