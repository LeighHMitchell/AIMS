'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnhancedMultiSelect } from '@/components/ui/enhanced-multi-select';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type {
  ActivityReadinessConfig,
  UpdateReadinessConfigRequest,
  FinancingType,
  FinancingModality,
} from '@/types/readiness';
import {
  FINANCING_TYPE_OPTIONS,
  FINANCING_MODALITY_OPTIONS,
} from '@/types/readiness';

interface ReadinessConfigSectionProps {
  config: ActivityReadinessConfig | null;
  onUpdate: (config: UpdateReadinessConfigRequest) => Promise<void>;
  disabled?: boolean;
}

export function ReadinessConfigSection({
  config,
  onUpdate,
  disabled = false,
}: ReadinessConfigSectionProps) {
  const [localConfig, setLocalConfig] = useState<{
    financing_type: FinancingType[];
    financing_modality: FinancingModality | null;
    is_infrastructure: boolean;
  }>({
    financing_type: config?.financing_type || [],
    financing_modality: config?.financing_modality || null,
    is_infrastructure: config?.is_infrastructure || false,
  });

  const handleFinancingTypeChange = (values: string[]) => {
    const newTypes = values as FinancingType[];
    const updated = { ...localConfig, financing_type: newTypes };
    setLocalConfig(updated);
    onUpdate({ ...updated, financing_type: newTypes.length > 0 ? newTypes : null });
  };

  const handleModalityChange = (value: string) => {
    const newModality = value as FinancingModality;
    const updated = { ...localConfig, financing_modality: newModality };
    setLocalConfig(updated);
    onUpdate({ ...updated, financing_type: updated.financing_type.length > 0 ? updated.financing_type : null });
  };

  const handleInfrastructureChange = (checked: boolean) => {
    const updated = { ...localConfig, is_infrastructure: checked };
    setLocalConfig(updated);
    onUpdate({ ...updated, financing_type: updated.financing_type.length > 0 ? updated.financing_type : null });
  };

  const financingTypeGroups = [{
    label: 'Financing Types',
    options: FINANCING_TYPE_OPTIONS.map(opt => ({
      code: opt.value,
      displayCode: opt.code,
      name: opt.label,
      description: opt.description,
    })),
  }];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Financing Type */}
        <div className="space-y-2">
          <Label htmlFor="financing-type" className="flex items-center gap-2">
            Financing Type
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Select one or more financing mechanisms. Blended projects (e.g. loan + grant) can pick multiple types.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <EnhancedMultiSelect
            groups={financingTypeGroups}
            value={localConfig.financing_type}
            onValueChange={handleFinancingTypeChange}
            placeholder="Select financing type(s)..."
            searchPlaceholder="Search financing types..."
            disabled={disabled}
            showCodeAndName
          />
        </div>

        {/* Financing Modality */}
        <div className="space-y-2">
          <Label htmlFor="financing-modality" className="flex items-center gap-2">
            Financing Modality
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Select the modality of financing. This determines which checklist items are applicable.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Select
            value={localConfig.financing_modality || ''}
            onValueChange={handleModalityChange}
            disabled={disabled}
          >
            <SelectTrigger id="financing-modality">
              <SelectValue placeholder="Select modality...">
                {localConfig.financing_modality ? (() => {
                  const opt = FINANCING_MODALITY_OPTIONS.find(o => o.value === localConfig.financing_modality);
                  return opt ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {opt.code}
                      </span>
                      <span>{opt.label}</span>
                    </span>
                  ) : null;
                })() : 'Select modality...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FINANCING_MODALITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="pl-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {option.code}
                    </span>
                    <div>
                      <div>{option.label}</div>
                      <div className="text-helper text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Infrastructure Toggle */}
        <div className="space-y-2">
          <Label htmlFor="is-infrastructure" className="flex items-center gap-2">
            Infrastructure Project
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="font-medium mb-1">Enable if the project includes physical works such as:</p>
                <ul className="list-disc list-inside text-helper space-y-0.5 mb-2">
                  <li>Construction of buildings, roads, bridges, or utilities</li>
                  <li>Land acquisition or resettlement</li>
                  <li>Rehabilitation or expansion of existing structures</li>
                  <li>Installation of equipment requiring civil works</li>
                </ul>
                <p className="text-helper">When enabled, additional checklist items for land acquisition, environmental assessment, and construction readiness will be shown.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="is-infrastructure"
              checked={localConfig.is_infrastructure}
              onCheckedChange={handleInfrastructureChange}
              disabled={disabled}
            />
            <Label
              htmlFor="is-infrastructure"
              className="text-body font-normal text-muted-foreground cursor-pointer"
            >
              {localConfig.is_infrastructure ? 'Yes' : 'No'}
            </Label>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ReadinessConfigSection;
