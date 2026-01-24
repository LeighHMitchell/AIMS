"use client"

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  MorphingPopover,
  MorphingPopoverContent,
  MorphingPopoverTrigger,
} from "@/components/motion-primitives/morphing-popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Check, Loader2, Building2 } from "lucide-react";
import Flag from 'react-world-flags';
import { IATI_COUNTRIES } from '@/data/iati-countries';
import { cn } from "@/lib/utils";
import { 
  INSTITUTIONAL_GROUPS, 
  isInstitutionalGroup
} from '@/data/location-groups';

// Organization Type mappings (IATI standard codes)
const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  '10': 'Government',
  '11': 'Local Government',
  '15': 'Other Public Sector',
  '21': 'International NGO',
  '22': 'National NGO',
  '23': 'Regional NGO',
  '24': 'Partner Country based NGO',
  '30': 'Public Private Partnership',
  '40': 'Multilateral',
  '60': 'Foundation',
  '70': 'Private Sector',
  '71': 'Private Sector in Provider Country',
  '72': 'Private Sector in Aid Recipient Country',
  '73': 'Private Sector in Third Country',
  '80': 'Academic, Training and Research',
  '90': 'Other',
};

// Legacy type values that may exist in database - map to IATI codes
const LEGACY_TYPE_TO_CODE: Record<string, string> = {
  'government': '10',
  'Government': '10',
  'local_government': '11',
  'Local Government': '11',
  'other_public_sector': '15',
  'Other Public Sector': '15',
  'international_ngo': '21',
  'International NGO': '21',
  'national_ngo': '22',
  'National NGO': '22',
  'regional_ngo': '23',
  'Regional NGO': '23',
  'partner_country_ngo': '24',
  'Partner Country based NGO': '24',
  'public_private_partnership': '30',
  'Public Private Partnership': '30',
  'multilateral': '40',
  'Multilateral': '40',
  'Other Multilateral': '40', // Legacy value - map to Multilateral
  'foundation': '60',
  'Foundation': '60',
  'private_sector': '70',
  'Private Sector': '70',
  'academic': '80',
  'Academic': '80',
  'Academic, Training and Research': '80',
  'other': '90',
  'Other': '90',
  // Common legacy values
  'development_partner': '40', // Map to Multilateral
  'Development Partner': '40',
  'bilateral': '10', // Map to Government (bilateral donors are typically government agencies)
  'Bilateral': '10',
  'ngo': '21', // Default to International NGO
  'NGO': '21',
  'International Financial Institution': '40', // Map to Multilateral
};

// Get the display code for a type value (handles both codes and legacy strings)
const getTypeCode = (value: string): string => {
  if (ORGANIZATION_TYPE_LABELS[value]) {
    return value; // Already a valid code
  }
  return LEGACY_TYPE_TO_CODE[value] || value; // Return mapped code or original
};

// Get the display label for a type value
const getTypeLabel = (value: string): string => {
  const code = getTypeCode(value);
  return ORGANIZATION_TYPE_LABELS[code] || value;
};

// Using IATI_COUNTRIES from @/data/iati-countries and INSTITUTIONAL_GROUPS from location-groups.ts

const FIELD_LABELS: Record<string, string> = {
  acronym: 'Acronym',
  iati_org_id: 'IATI Identifier',
  type: 'Organization Type',
  country_represented: 'Location Represented',
  default_currency: 'Default Currency',
};

type EditableCellProps = {
  organizationId: string;
  field: string;
  value: string | undefined;
  onSave: (organizationId: string, field: string, value: string) => Promise<void>;
  isEditable: boolean;
  isValidIdentifier?: (identifier: string) => boolean;
};

export function EditableCell({
  organizationId,
  field,
  value,
  onSave,
  isEditable,
  isValidIdentifier,
}: EditableCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value with prop (convert legacy types to IATI codes)
  useEffect(() => {
    if (field === 'type' && value) {
      // Convert legacy type strings to IATI codes
      setLocalValue(getTypeCode(value));
    } else {
      setLocalValue(value || '');
    }
  }, [value, field]);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-open Select dropdown when popover opens for select-based fields
  useEffect(() => {
    if (isOpen && (field === 'country' || field === 'type' || field === 'default_currency')) {
      // Small delay to ensure popover is rendered first
      setTimeout(() => setSelectOpen(true), 50);
    } else {
      setSelectOpen(false);
    }
  }, [isOpen, field]);

  const handleSave = async (newValue: string) => {
    if (newValue === value) {
      setIsOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(organizationId, field, newValue);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectChange = async (newValue: string) => {
    setLocalValue(newValue);
    await handleSave(newValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(localValue);
    }
  };

  const handleOpenChange = async (open: boolean) => {
    if (!open && !isSaving) {
      // Save on close for text inputs
      if (field === 'acronym' || field === 'iati_org_id') {
        if (localValue !== value) {
          handleSave(localValue);
          return;
        }
      }
      // For type field, check if we need to normalize a legacy value
      if (field === 'type' && value) {
        const normalizedCode = getTypeCode(value);
        // If the original value was a legacy string (not an IATI code), save the normalized code
        if (normalizedCode !== value && ORGANIZATION_TYPE_LABELS[normalizedCode]) {
          await handleSave(normalizedCode);
          return;
        }
      }
    }
    setIsOpen(open);
    if (!open) {
      setCountrySearchTerm('');
    }
  };

  // Render the display value
  const renderDisplayValue = () => {
    if (!value) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Missing
        </Badge>
      );
    }

    switch (field) {
      case 'type':
        const typeCode = getTypeCode(value);
        const typeLabel = getTypeLabel(value);
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {typeCode}
            </span>
            <span className="text-sm">{typeLabel}</span>
          </div>
        );
      case 'country':
        const countryInfo = IATI_COUNTRIES.find(c => c.name === value);
        if (countryInfo) {
          return (
            <div className="flex items-center gap-2">
              <Flag code={countryInfo.code} className="h-4 w-6 object-cover rounded" />
              <span className="text-sm">{value}</span>
            </div>
          );
        }
        // Check if it's an institutional group
        if (isInstitutionalGroup(value)) {
          // Special case for United Nations - show UN flag
          if (value === 'United Nations') {
            return (
              <div className="flex items-center gap-2">
                <img src="/images/flags/united-nations.svg" alt="UN Flag" className="h-4 w-6 object-cover rounded" />
                <span className="text-sm">{value}</span>
              </div>
            );
          }
          // Special case for European Union Institutions - show EU flag
          if (value === 'European Union Institutions') {
            return (
              <div className="flex items-center gap-2">
                <img src="/images/flags/european-union.svg" alt="EU Flag" className="h-4 w-6 object-cover rounded" />
                <span className="text-sm">{value}</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{value}</span>
            </div>
          );
        }
        // Fallback for legacy or unknown values
        return <span className="text-sm">{value}</span>;
      case 'iati_org_id':
        const isValid = isValidIdentifier ? isValidIdentifier(value) : true;
        if (!isValid) {
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{value}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">Invalid IATI Organization Identifier</p>
                      <p>Required format: AGENCY-REGISTRATION</p>
                      <p className="text-gray-400">Examples:</p>
                      <p className="text-gray-400">• XI-IATI-1234</p>
                      <p className="text-gray-400">• GB-COH-123456</p>
                      <p className="text-gray-400">• US-EIN-12-3456789</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        }
        return <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{value}</span>;
      default:
        return <span className="text-sm">{value}</span>;
    }
  };

  // Render the edit control based on field type
  const renderEditControl = () => {
    switch (field) {
      case 'type':
        // Ensure we're working with the IATI code, not legacy string
        const currentTypeCode = getTypeCode(localValue);
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{FIELD_LABELS[field]}</Label>
            <Select 
              value={currentTypeCode} 
              onValueChange={handleSelectChange}
              open={selectOpen}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORGANIZATION_TYPE_LABELS).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    <span className="font-mono text-muted-foreground mr-2">[{code}]</span>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'country':
        const searchLower = countrySearchTerm.toLowerCase();
        
        // Filter institutional groups (parent groups only - not sub-groups/subsidiaries)
        const filteredInstitutionalGroups = INSTITUTIONAL_GROUPS.filter(group =>
          group.name.toLowerCase().includes(searchLower) ||
          (group.description?.toLowerCase().includes(searchLower) ?? false)
        );
        
        const filteredCountries = IATI_COUNTRIES.filter(country =>
          !country.withdrawn && (
            country.name.toLowerCase().includes(searchLower) ||
            country.code.toLowerCase().includes(searchLower)
          )
        );

        const hasInstitutionalResults = filteredInstitutionalGroups.length > 0;
        const hasCountryResults = filteredCountries.length > 0;

        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{FIELD_LABELS[field]}</Label>
            <Select 
              value={localValue} 
              onValueChange={(val) => {
                handleSelectChange(val);
                setCountrySearchTerm('');
              }}
              open={selectOpen}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country or institution">
                  {localValue && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const country = IATI_COUNTRIES.find(c => c.name === localValue);
                        if (country) {
                          return (
                            <>
                              <Flag code={country.code} className="h-4 w-6 object-cover rounded" />
                              <span>{localValue}</span>
                            </>
                          );
                        }
                        if (isInstitutionalGroup(localValue)) {
                          // Special case for United Nations - show UN flag
                          if (localValue === 'United Nations') {
                            return (
                              <>
                                <img src="/images/flags/united-nations.svg" alt="UN Flag" className="h-4 w-6 object-cover rounded" />
                                <span>{localValue}</span>
                              </>
                            );
                          }
                          // Special case for European Union Institutions - show EU flag
                          if (localValue === 'European Union Institutions') {
                            return (
                              <>
                                <img src="/images/flags/european-union.svg" alt="EU Flag" className="h-4 w-6 object-cover rounded" />
                                <span>{localValue}</span>
                              </>
                            );
                          }
                          return (
                            <>
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{localValue}</span>
                            </>
                          );
                        }
                        return <span>{localValue}</span>;
                      })()}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {/* Search Box */}
                <div className="px-2 pb-2 border-b sticky top-0 bg-white z-10">
                  <Input
                    placeholder="Search countries or institutions..."
                    value={countrySearchTerm}
                    onChange={(e) => setCountrySearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="h-8"
                    autoFocus
                  />
                </div>

                {/* Institutional Groups */}
                {hasInstitutionalResults && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-600 bg-gray-50">
                      Institutional Groups
                    </div>
                    {filteredInstitutionalGroups.map((group) => (
                      <SelectItem key={group.code} value={group.name} className="font-medium">
                        <div className="flex items-center gap-2">
                          {group.name === 'United Nations' ? (
                            <img src="/images/flags/united-nations.svg" alt="UN Flag" className="h-4 w-6 object-cover rounded flex-shrink-0" />
                          ) : group.name === 'European Union Institutions' ? (
                            <img src="/images/flags/european-union.svg" alt="EU Flag" className="h-4 w-6 object-cover rounded flex-shrink-0" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span>{group.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {hasCountryResults && <div className="my-1 border-t" />}
                  </>
                )}

                {/* Country Options */}
                {hasCountryResults && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-600 bg-gray-50">
                      Countries
                    </div>
                    {filteredCountries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        <div className="flex items-center gap-2">
                          <Flag code={country.code} className="h-4 w-6 object-cover rounded" />
                          <span>{country.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* No Results */}
                {!hasInstitutionalResults && !hasCountryResults && (
                  <div className="px-2 py-6 text-center text-sm text-gray-500">
                    No results found for "{countrySearchTerm}"
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      case 'default_currency':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{FIELD_LABELS[field]}</Label>
            <Select 
              value={localValue} 
              onValueChange={handleSelectChange}
              open={selectOpen}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'acronym':
      case 'iati_org_id':
      default:
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{FIELD_LABELS[field] || field}</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  field === 'iati_org_id' ? 'e.g., XI-IATI-1234' :
                  field === 'acronym' ? 'e.g., UN, WHO' :
                  'Enter value'
                }
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => handleSave(localValue)}
                disabled={isSaving}
                className="relative overflow-hidden"
              >
                <motion.div
                  initial={false}
                  animate={{ 
                    opacity: isSaving ? 0 : 1,
                    scale: isSaving ? 0.5 : 1,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
                {isSaving && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </motion.div>
                )}
              </Button>
            </div>
            {field === 'iati_org_id' && (
              <p className="text-xs text-muted-foreground">
                Format: AGENCY-REGISTRATION (e.g., GB-COH-123456)
              </p>
            )}
          </div>
        );
    }
  };

  // Non-editable display
  if (!isEditable) {
    return <div className="flex items-center">{renderDisplayValue()}</div>;
  }

  return (
    <MorphingPopover
      open={isOpen}
      onOpenChange={handleOpenChange}
      variants={{
        initial: { opacity: 0, filter: 'blur(4px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(4px)' },
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <MorphingPopoverTrigger>
        <div
          className={cn(
            "flex items-center gap-2 p-1.5 -m-1.5 rounded-md transition-colors text-left",
            "hover:bg-muted/60 cursor-pointer",
            isOpen && "bg-muted/60"
          )}
        >
          <motion.div
            layoutId={`editable-cell-${organizationId}-${field}`}
            layout="position"
          >
            {renderDisplayValue()}
          </motion.div>
        </div>
      </MorphingPopoverTrigger>
      <MorphingPopoverContent className="w-72 p-4">
        <motion.div
          layoutId={`editable-cell-${organizationId}-${field}`}
          layout="position"
          className="mb-2"
        >
          {renderEditControl()}
        </motion.div>
      </MorphingPopoverContent>
    </MorphingPopover>
  );
}




