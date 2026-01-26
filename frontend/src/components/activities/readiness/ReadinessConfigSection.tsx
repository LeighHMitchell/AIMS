'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HelpCircle, Briefcase, Target, Wallet, FileEdit, Landmark, Gift, GraduationCap, Layers, MoreHorizontal } from 'lucide-react';
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
    financing_type: FinancingType | null;
    financing_modality: FinancingModality | null;
    is_infrastructure: boolean;
  }>({
    financing_type: config?.financing_type || null,
    financing_modality: config?.financing_modality || null,
    is_infrastructure: config?.is_infrastructure || false,
  });

  // Update local state when config changes
  useEffect(() => {
    setLocalConfig({
      financing_type: config?.financing_type || null,
      financing_modality: config?.financing_modality || null,
      is_infrastructure: config?.is_infrastructure || false,
    });
  }, [config]);

  const handleFinancingTypeChange = async (value: string) => {
    const newType = value as FinancingType;
    setLocalConfig(prev => ({ ...prev, financing_type: newType }));
    await onUpdate({
      ...localConfig,
      financing_type: newType,
    });
  };

  const handleModalityChange = async (value: string) => {
    const newModality = value as FinancingModality;
    setLocalConfig(prev => ({ ...prev, financing_modality: newModality }));
    await onUpdate({
      ...localConfig,
      financing_modality: newModality,
    });
  };

  const handleInfrastructureChange = async (checked: boolean) => {
    setLocalConfig(prev => ({ ...prev, is_infrastructure: checked }));
    await onUpdate({
      ...localConfig,
      is_infrastructure: checked,
    });
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Financing Type */}
        <div className="space-y-2">
          <Label htmlFor="financing-type" className="flex items-center gap-2">
            Financing Type
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Select whether this project is funded through a loan, grant, or other financing mechanism.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Select
            value={localConfig.financing_type || ''}
            onValueChange={handleFinancingTypeChange}
            disabled={disabled}
          >
            <SelectTrigger id="financing-type">
              <SelectValue placeholder="Select financing type..." />
            </SelectTrigger>
            <SelectContent>
              {FINANCING_TYPE_OPTIONS.map((option) => {
                const IconComponent = {
                  Landmark,
                  Gift,
                  GraduationCap,
                  Layers,
                  MoreHorizontal,
                }[option.icon];
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-gray-500" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Financing Modality */}
        <div className="space-y-2">
          <Label htmlFor="financing-modality" className="flex items-center gap-2">
            Financing Modality
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
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
              <SelectValue placeholder="Select modality..." />
            </SelectTrigger>
            <SelectContent>
              {FINANCING_MODALITY_OPTIONS.map((option) => {
                const IconComponent = {
                  Briefcase,
                  Target,
                  Wallet,
                  FileEdit,
                }[option.icon];
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-start gap-2">
                      <IconComponent className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Infrastructure Toggle */}
        <div className="space-y-2">
          <Label htmlFor="is-infrastructure" className="flex items-center gap-2">
            Infrastructure Project
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Enable this for projects involving construction, land acquisition, or physical infrastructure.</p>
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
              className="text-sm font-normal text-gray-600 cursor-pointer"
            >
              {localConfig.is_infrastructure ? 'Yes' : 'No'}
            </Label>
          </div>
          {localConfig.is_infrastructure && (
            <p className="text-xs text-gray-500">
              Additional items for land acquisition, environmental assessment, and construction will be shown.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ReadinessConfigSection;
