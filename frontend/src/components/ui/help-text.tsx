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
              "inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors",
              className
            )}
          >
            <span className="font-medium">{title}</span>
            <HelpCircle className={cn("w-4 h-4", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-sm p-4 bg-white border border-gray-200 shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
            {Array.isArray(content) ? (
              <ul className="text-sm text-gray-700 space-y-1.5">
                {content.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-700">{content}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export type { HelpTextProps }; 