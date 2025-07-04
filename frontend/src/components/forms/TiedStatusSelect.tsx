"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TiedStatusOption {
  code: string;
  name: string;
  description: string;
}

const TIED_STATUS_OPTIONS: TiedStatusOption[] = [
  {
    code: "3",
    name: "Partially tied",
    description: "Official Development Assistance for which the associated goods and services must be procured from a restricted number of countries, which must however include substantially all aid recipient countries and can include the donor country."
  },
  {
    code: "4",
    name: "Tied",
    description: "Official grants or loans where procurement of the goods or services involved is limited to the donor country or to a group of countries which does not include substantially all aid recipient countries."
  },
  {
    code: "5",
    name: "Untied",
    description: "Untied aid is defined as loans and grants whose proceeds are fully and freely available to finance procurement from all OECD countries and substantially all developing countries."
  }
];

interface TiedStatusSelectProps {
  value?: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TiedStatusSelect({
  value,
  onValueChange,
  placeholder = "Select tied status",
  disabled = false,
  className,
  id,
}: TiedStatusSelectProps) {
  return (
    <Select 
      value={value || ""} 
      onValueChange={(val) => onValueChange?.(val === "" ? null : val)} 
      disabled={disabled}
    >
      <SelectTrigger className={className} id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent 
        className="max-h-[400px] w-[var(--radix-select-trigger-width)]"
        position="popper"
        sideOffset={5}
      >
        {TIED_STATUS_OPTIONS.map((option) => (
          <SelectItem 
            key={option.code} 
            value={option.code}
            className="py-3 cursor-pointer hover:bg-accent focus:bg-accent"
          >
            <div className="flex flex-col">
              <div className="font-medium">{option.code} - {option.name}</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-[400px] whitespace-normal">
                {option.description}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 