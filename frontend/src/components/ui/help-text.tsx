"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTextProps {
  title: string;
  content: string[] | React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export function HelpText({ title, content, className, iconClassName }: HelpTextProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground transition-colors",
              className
            )}
          >
            <span className="font-medium">{title}</span>
            <HelpCircle className={cn("w-4 h-4", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-sm p-4 bg-white border border-border shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-body">{title}</h4>
            {Array.isArray(content) ? (
              <ul className="text-body text-foreground space-y-1.5">
                {content.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-body text-foreground">{content}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export type { HelpTextProps }; 