'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
} from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  Transition,
  Variants,
} from 'motion/react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const TRANSITION: Transition = {
  type: 'spring',
  bounce: 0.1,
  duration: 0.4,
};

type MorphingPopoverContextType = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueId: string;
  triggerRef: React.RefObject<HTMLDivElement>;
  variants?: Variants;
  transition?: Transition;
};

const MorphingPopoverContext = createContext<MorphingPopoverContextType | null>(
  null
);

function useMorphingPopover() {
  const context = useContext(MorphingPopoverContext);
  if (!context) {
    throw new Error(
      'useMorphingPopover must be used within a MorphingPopover'
    );
  }
  return context;
}

type MorphingPopoverProps = {
  children: React.ReactNode;
  transition?: Transition;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variants?: Variants;
  className?: string;
};

function MorphingPopover({
  children,
  transition = TRANSITION,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  variants,
  className,
}: MorphingPopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const uniqueId = useId();
  const triggerRef = useRef<HTMLDivElement>(null!);

  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const setIsOpen = useCallback(
    (value: React.SetStateAction<boolean>) => {
      const newValue = typeof value === 'function' ? value(isOpen) : value;
      if (controlledOpen === undefined) {
        setUncontrolledOpen(newValue);
      }
      onOpenChange?.(newValue);
    },
    [controlledOpen, isOpen, onOpenChange]
  );

  return (
    <MorphingPopoverContext.Provider
      value={{
        isOpen,
        setIsOpen,
        uniqueId,
        triggerRef,
        variants,
        transition,
      }}
    >
      <MotionConfig transition={transition}>
        <div className={cn('relative', className)}>{children}</div>
      </MotionConfig>
    </MorphingPopoverContext.Provider>
  );
}

type MorphingPopoverTriggerProps = {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

function MorphingPopoverTrigger({
  children,
  asChild = false,
  className,
}: MorphingPopoverTriggerProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingPopover();

  const handleClick = () => {
    setIsOpen(true);
  };

  return (
    <motion.div
      ref={triggerRef}
      layoutId={`morphing-popover-${uniqueId}`}
      className={cn('inline-flex', className)}
      style={{ borderRadius: 8 }}
    >
      <AnimatePresence mode="popLayout">
        {!isOpen && (
          asChild ? (
            <Slot className="w-full h-full" onClick={handleClick}>
              {children}
            </Slot>
          ) : (
            <button 
              className="w-full h-full cursor-pointer"
              onClick={handleClick}
            >
              {children}
            </button>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type MorphingPopoverContentProps = {
  children: React.ReactNode;
  className?: string;
};

function MorphingPopoverContent({
  children,
  className,
}: MorphingPopoverContentProps) {
  const { isOpen, setIsOpen, uniqueId, triggerRef, variants, transition } =
    useMorphingPopover();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is inside the popover content
      if (contentRef.current && contentRef.current.contains(target)) {
        return;
      }
      
      // Check if click is inside the trigger
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      
      // Check if click is inside a Radix UI portal (Select, Dialog, etc.)
      // These render outside the DOM tree but should not close the popover
      if (target.closest('[data-radix-popper-content-wrapper]') ||
          target.closest('[data-radix-select-viewport]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[data-radix-collection-item]')) {
        return;
      }
      
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setIsOpen, triggerRef]);

  return (
    <AnimatePresence mode="popLayout">
      {isOpen && (
        <motion.div
          ref={contentRef}
          layoutId={`morphing-popover-${uniqueId}`}
          className={cn(
            'absolute z-50 overflow-hidden border border-border bg-background shadow-lg outline-none',
            className
          )}
          style={{ borderRadius: 12 }}
          initial={variants?.initial}
          animate={variants?.animate}
          exit={variants?.exit}
          transition={transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export {
  MorphingPopover,
  MorphingPopoverTrigger,
  MorphingPopoverContent,
  useMorphingPopover,
};



