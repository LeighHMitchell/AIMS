import { useState } from 'react';

export function useDropdownState(dropdownId: string) {
  const [isOpen, setIsOpen] = useState(false);
  
  const setOpen = (open: boolean) => {
    setIsOpen(open);
  };
  
  return { isOpen, setOpen };
} 