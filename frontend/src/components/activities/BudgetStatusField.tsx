"use client";

import React, { useState, useEffect } from "react";
import { useFieldAutosave } from "@/hooks/use-field-autosave-new";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LabelSaveIndicator } from "@/components/ui/save-indicator";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  PieChart,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import {
  BudgetStatusType,
  BUDGET_STATUS_OPTIONS,
  BUDGET_STATUS_COLORS,
  getBudgetStatusLabel,
  validateBudgetStatus,
} from "@/types/activity-budget-status";

interface BudgetStatusFieldProps {
  activityId: string;
  userId: string;
  budgetStatus: BudgetStatusType;
  onBudgetPercentage?: number | null;
  budgetStatusNotes?: string | null;
  onActivityChange: (field: string, value: any) => void;
  disabled?: boolean;
}

const StatusIcon = ({ status }: { status: BudgetStatusType }) => {
  const iconClass = "h-4 w-4";
  switch (status) {
    case "on_budget":
      return <CheckCircle2 className={`${iconClass} text-green-600`} />;
    case "off_budget":
      return <XCircle className={`${iconClass} text-red-600`} />;
    case "partial":
      return <PieChart className={`${iconClass} text-yellow-600`} />;
    case "unknown":
    default:
      return <HelpCircle className={`${iconClass} text-gray-400`} />;
  }
};

export function BudgetStatusField({
  activityId,
  userId,
  budgetStatus = "unknown",
  onBudgetPercentage,
  budgetStatusNotes,
  onActivityChange,
  disabled = false,
}: BudgetStatusFieldProps) {
  const [localPercentage, setLocalPercentage] = useState<string>(
    onBudgetPercentage?.toString() || ""
  );
  const [localNotes, setLocalNotes] = useState<string>(budgetStatusNotes || "");
  const [percentageError, setPercentageError] = useState<string | null>(null);

  // Sync local state with props
  useEffect(() => {
    setLocalPercentage(onBudgetPercentage?.toString() || "");
  }, [onBudgetPercentage]);

  useEffect(() => {
    setLocalNotes(budgetStatusNotes || "");
  }, [budgetStatusNotes]);

  // Autosave hooks
  const statusAutosave = useFieldAutosave("budgetStatus", {
    activityId,
    userId,
    immediate: true,
    onSuccess: () => {
      toast.success("Budget status saved", { position: "top-center" });
    },
  });

  const percentageAutosave = useFieldAutosave("onBudgetPercentage", {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success("On-budget percentage saved", { position: "top-center" });
    },
  });

  const notesAutosave = useFieldAutosave("budgetStatusNotes", {
    activityId,
    userId,
    debounceMs: 2000,
    onSuccess: () => {
      toast.success("Budget notes saved", { position: "top-center" });
    },
  });

  // Handle status change
  const handleStatusChange = (value: string) => {
    const newStatus = value as BudgetStatusType;
    onActivityChange("budgetStatus", newStatus);
    statusAutosave.triggerFieldSave(newStatus);

    // Clear percentage if not partial
    if (newStatus !== "partial") {
      setLocalPercentage("");
      setPercentageError(null);
      onActivityChange("onBudgetPercentage", null);
      percentageAutosave.triggerFieldSave(null);
    }
  };

  // Handle percentage change
  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalPercentage(value);

    // Validate
    const numValue = parseFloat(value);
    if (value && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
      setPercentageError("Percentage must be between 0 and 100");
      return;
    }
    setPercentageError(null);

    const finalValue = value ? numValue : null;
    onActivityChange("onBudgetPercentage", finalValue);
    percentageAutosave.triggerFieldSave(finalValue);
  };

  // Handle notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalNotes(value);
    onActivityChange("budgetStatusNotes", value || null);
    notesAutosave.triggerFieldSave(value || null);
  };

  const isPartial = budgetStatus === "partial";

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Budget Status
          <HelpTextTooltip>
            <p className="text-sm">
              Set whether this activity is reflected in the government budget.
            </p>
            <ul className="text-xs mt-2 space-y-1">
              <li>
                <strong>On Budget:</strong> Fully included in government budget
              </li>
              <li>
                <strong>Off Budget:</strong> Not included in government budget
              </li>
              <li>
                <strong>Partial:</strong> Partially on budget (specify percentage)
              </li>
              <li>
                <strong>Unknown:</strong> Budget status not yet determined
              </li>
            </ul>
          </HelpTextTooltip>
        </h3>
        {budgetStatus !== "unknown" && (
          <Badge
            variant="outline"
            className={`${BUDGET_STATUS_COLORS[budgetStatus]} flex items-center gap-1`}
          >
            <StatusIcon status={budgetStatus} />
            {getBudgetStatusLabel(budgetStatus)}
          </Badge>
        )}
      </div>

      {/* Status Select */}
      <div className="space-y-2">
        <LabelSaveIndicator
          isSaving={statusAutosave.state.isSaving}
          isSaved={statusAutosave.state.isPersistentlySaved || budgetStatus !== "unknown"}
          hasValue={budgetStatus !== "unknown"}
          className="text-gray-700"
        >
          Status
        </LabelSaveIndicator>
        <Select
          value={budgetStatus}
          onValueChange={handleStatusChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Select budget status" />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="inline-flex items-center gap-2">
                  <StatusIcon status={option.value} />
                  <span>{option.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Percentage Input (shown only for partial) */}
      {isPartial && (
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={percentageAutosave.state.isSaving}
            isSaved={percentageAutosave.state.isPersistentlySaved || !!onBudgetPercentage}
            hasValue={!!onBudgetPercentage}
            className="text-gray-700"
          >
            On-Budget Percentage
          </LabelSaveIndicator>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={localPercentage}
              onChange={handlePercentageChange}
              placeholder="e.g., 60"
              className={`w-32 bg-white ${percentageError ? "border-red-500" : ""}`}
              disabled={disabled}
            />
            <span className="text-gray-600">%</span>
            {percentageError && (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {percentageError}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Percentage of activity funding that is included in the government budget
          </p>
        </div>
      )}

      {/* Notes Textarea */}
      <div className="space-y-2">
        <LabelSaveIndicator
          isSaving={notesAutosave.state.isSaving}
          isSaved={notesAutosave.state.isPersistentlySaved || !!budgetStatusNotes}
          hasValue={!!budgetStatusNotes}
          className="text-gray-700"
        >
          Notes
        </LabelSaveIndicator>
        <Textarea
          value={localNotes}
          onChange={handleNotesChange}
          placeholder="Explain the budget status determination..."
          rows={2}
          className="bg-white resize-none"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Document reasons for the budget status determination
        </p>
      </div>
    </div>
  );
}
