"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DropdownOption {
  label: string;
  value: string;
}

interface SupabaseDropdownProps {
  table: string;
  column: string;
  rowId: string;
  options: DropdownOption[];
  label?: string;
  tooltip?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onValueChange?: (value: string) => void;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function SupabaseDropdown({
  table,
  column,
  rowId,
  options,
  label,
  tooltip,
  disabled = false,
  placeholder = "Select an option",
  className,
  onValueChange,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
}: SupabaseDropdownProps) {
  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch initial value on mount
  useEffect(() => {
    const fetchInitialValue = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from(table)
          .select(column)
          .eq("id", rowId)
          .single();

        if (error) {
          console.error(`Error fetching ${column} from ${table}:`, error);
          setError(error.message);
          toast.error(`Failed to load ${label || column}`);
        } else if (data) {
          setValue((data as Record<string, any>)[column] || "");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (rowId && table && column) {
      fetchInitialValue();
    }
  }, [rowId, table, column, supabase, label]);

  // Handle value change and update Supabase
  const handleValueChange = async (newValue: string) => {
    // Optimistic UI update
    const previousValue = value;
    setValue(newValue);

    // Call parent onChange if provided
    onValueChange?.(newValue);

    try {
      setUpdating(true);
      setError(null);

      const { error } = await supabase
        .from(table)
        .update({ [column]: newValue })
        .eq("id", rowId);

      if (error) {
        // Revert on error
        setValue(previousValue);
        
        // Handle RLS errors specifically
        if (error.code === "42501") {
          console.error("RLS Policy Error:", error);
          toast.error("You don't have permission to update this field");
        } else {
          console.error(`Error updating ${column}:`, error);
          toast.error(`Failed to update ${label || column}`);
        }
        
        setError(error.message);
      } else {
        // Success feedback
        toast.success(`${label || column} updated successfully`);
      }
    } catch (err) {
      // Revert on error
      setValue(previousValue);
      console.error("Unexpected error during update:", err);
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center gap-2">
          <Label htmlFor={`${table}-${column}-${rowId}`}>{label}</Label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      
      <div className="relative">
        <Select
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled || loading || updating}
        >
          <SelectTrigger
            id={`${table}-${column}-${rowId}`}
            className={cn(
              "w-full",
              error && "border-destructive",
              updating && "opacity-70"
            )}
          >
            <SelectValue placeholder={loading ? "Loading..." : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {updating && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// Export a typed version for activities table
export function ActivitySupabaseDropdown({
  activityId,
  ...props
}: Omit<SupabaseDropdownProps, "table" | "rowId"> & { activityId: string }) {
  return (
    <SupabaseDropdown
      {...props}
      table="activities"
      rowId={activityId}
    />
  );
} 