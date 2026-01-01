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
import { cn } from "@/lib/utils";
import { 
  INSTITUTIONAL_GROUPS, 
  isInstitutionalGroup,
  type InstitutionalGroup 
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

// ISO 3166-1 alpha-2 country codes with names
const ISO_COUNTRIES = [
  { code: 'MM', name: 'Myanmar' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei Darussalam' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'Korea, Republic of' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russian Federation' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
];

// REGIONAL_OPTIONS removed - now using INSTITUTIONAL_GROUPS from location-groups.ts

const FIELD_LABELS: Record<string, string> = {
  acronym: 'Acronym',
  iati_org_id: 'IATI Identifier',
  type: 'Organization Type',
  country: 'Country/Region',
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
        const countryInfo = ISO_COUNTRIES.find(c => c.name === value);
        return (
          <div className="flex items-center gap-2">
            {countryInfo && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {countryInfo.code}
              </span>
            )}
            <span className="text-sm">{value}</span>
          </div>
        );
      case 'iati_org_id':
        const isValid = isValidIdentifier ? isValidIdentifier(value) : true;
        if (!isValid) {
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-orange-600">{value}</span>
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
        return <span className="text-sm">{value}</span>;
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
            <Select value={currentTypeCode} onValueChange={handleSelectChange}>
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
        
        // Filter institutional groups (including sub-groups)
        const filteredInstitutionalGroups = INSTITUTIONAL_GROUPS.map(group => {
          const groupMatches = group.name.toLowerCase().includes(searchLower) ||
            (group.description?.toLowerCase().includes(searchLower) ?? false);
          
          const filteredSubGroups = group.subGroups?.filter(sub =>
            sub.name.toLowerCase().includes(searchLower) ||
            (sub.description?.toLowerCase().includes(searchLower) ?? false)
          ) || [];
          
          // Include group if it matches or any of its sub-groups match
          if (groupMatches || filteredSubGroups.length > 0) {
            return {
              ...group,
              // If group matches, show all sub-groups; otherwise show only matching sub-groups
              subGroups: groupMatches ? group.subGroups : filteredSubGroups
            };
          }
          return null;
        }).filter((g): g is InstitutionalGroup => g !== null);
        
        const filteredCountries = ISO_COUNTRIES.filter(country =>
          country.name.toLowerCase().includes(searchLower) ||
          country.code.toLowerCase().includes(searchLower)
        );

        const hasInstitutionalResults = filteredInstitutionalGroups.length > 0;
        const hasCountryResults = filteredCountries.length > 0;

        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{FIELD_LABELS[field]}</Label>
            <Select value={localValue} onValueChange={(val) => {
              handleSelectChange(val);
              setCountrySearchTerm('');
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country or institution">
                  {localValue && (
                    <div className="flex items-center gap-2">
                      {ISO_COUNTRIES.find(c => c.name === localValue) ? (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {ISO_COUNTRIES.find(c => c.name === localValue)?.code}
                        </span>
                      ) : isInstitutionalGroup(localValue) ? (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                      <span>{localValue}</span>
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
                    className="h-8"
                  />
                </div>

                {/* Institutional Groups */}
                {hasInstitutionalResults && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-600 bg-gray-50">
                      Institutional Groups
                    </div>
                    {filteredInstitutionalGroups.map((group) => (
                      <div key={group.code}>
                        {/* Parent Group */}
                        <SelectItem value={group.name} className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{group.name}</span>
                          </div>
                        </SelectItem>
                        {/* Sub-Groups (indented) */}
                        {group.subGroups?.map((subGroup) => (
                          <SelectItem key={subGroup.code} value={subGroup.name} className="pl-8">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">└</span>
                              <span className="truncate max-w-[280px]">
                                {subGroup.description || subGroup.name}
                              </span>
                              {subGroup.description && (
                                <span className="text-xs text-muted-foreground">
                                  ({subGroup.name})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
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
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {country.code}
                          </span>
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
            <Select value={localValue} onValueChange={handleSelectChange}>
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




