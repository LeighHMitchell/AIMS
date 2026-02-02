"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ImportProgressRollerProps {
  message: string;
  className?: string;
}

/**
 * Animated text roller for showing import progress messages.
 * When the message changes, the new message scrolls in from below while the old scrolls up.
 */
export function ImportProgressRoller({ message, className }: ImportProgressRollerProps) {
  const [messages, setMessages] = useState<string[]>([message]);
  const [translateY, setTranslateY] = useState(0);
  const prevMessageRef = useRef(message);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message !== prevMessageRef.current) {
      prevMessageRef.current = message;

      // Add new message to the list
      setMessages(prev => [...prev, message]);

      // Animate after a short delay to ensure render
      const animateTimer = setTimeout(() => {
        setTranslateY(prev => prev - 24); // Move up by 24px (h-6 = 1.5rem = 24px)
      }, 20);

      // Cleanup old messages after animation
      const cleanupTimer = setTimeout(() => {
        setMessages([message]);
        setTranslateY(0);
      }, 250);

      return () => {
        clearTimeout(animateTimer);
        clearTimeout(cleanupTimer);
      };
    }
  }, [message]);

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{ height: '24px' }}
    >
      <div
        ref={containerRef}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: translateY !== 0 ? 'transform 200ms ease-out' : 'none',
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={`${index}-${msg}`}
            className="flex items-center text-sm font-medium whitespace-nowrap text-muted-foreground"
            style={{ height: '24px' }}
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImportProgressRoller;
