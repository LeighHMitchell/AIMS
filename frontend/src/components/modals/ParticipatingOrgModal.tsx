"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { OrganizationCombobox } from '@/components/ui/organization-combobox';
import { EnhancedSearchableSelect } from '@/components/ui/enhanced-searchable-select';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { useOrganizations } from '@/hooks/use-organizations';
import { IATI_ORGANIZATION_ROLES } from '@/data/iati-organization-roles';
import { getOrganizationRoleName } from '@/data/iati-organization-roles';
import { IATI_CRS_CHANNEL_CODES, getCRSChannelCodeOptions } from '@/data/iati-crs-channel-codes';
import { LANGUAGES } from '@/data/languages';
import { Plus, Save, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ParticipatingOrgModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ParticipatingOrgData) => Promise<void>;
  editingOrg?: ParticipatingOrgData | null;
  activityId: string;
}

export interface ParticipatingOrgData {
  id?: string;
  organization_id: string;
  role_type: 'funding' | 'extending' | 'implementing' | 'government';
  iati_role_code: number;
  iati_org_ref?: string;
  org_type?: string;
  activity_id_ref?: string;
  crs_channel_code?: string;
  narrative?: string;
  narrative_lang?: string;
  narratives?: Array<{ lang: string; text: string }>;
  org_activity_id?: string;
  reporting_org_ref?: string;
  secondary_reporter?: boolean;
}

export function ParticipatingOrgModal({ 
  open, 
  onClose, 
  onSave, 
  editingOrg,
  activityId 
}: ParticipatingOrgModalProps) {
  const { organizations, loading: orgsLoading } = useOrganizations();
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ParticipatingOrgData>>({
    organization_id: '',
    role_type: 'implementing',
    iati_role_code: 4,
    narrative_lang: 'en',
    narratives: [],
    secondary_reporter: false
  });

  // Load editing data
  useEffect(() => {
    if (editingOrg) {
      console.log('[ParticipatingOrgModal] Loading editingOrg:', editingOrg);
      
      // Ensure narratives is always an array
      const narrativesArray = Array.isArray(editingOrg.narratives) 
        ? editingOrg.narratives 
        : (editingOrg.narratives ? [] : []);
      
      console.log('[ParticipatingOrgModal] Narratives array:', narrativesArray);
      console.log('[ParticipatingOrgModal] Role code:', editingOrg.iati_role_code);
      console.log('[ParticipatingOrgModal] Activity ID ref:', editingOrg.activity_id_ref);
      console.log('[ParticipatingOrgModal] Org Activity ID:', editingOrg.org_activity_id);
      
      setFormData({
        ...editingOrg,
        narratives: narrativesArray,
        secondary_reporter: editingOrg.secondary_reporter || false
      });
      
      // Keep advanced fields hidden by default, even if filled
      setShowAdvanced(false);
    } else {
      // Reset for new entry
      setFormData({
        organization_id: '',
        role_type: 'implementing',
        iati_role_code: 4,
        narrative_lang: 'en',
        narratives: [],
        secondary_reporter: false
      });
      setShowAdvanced(false);
    }
  }, [editingOrg, open]);

  // Auto-populate IATI ref, type, and narrative when organization is selected
  // This preserves backend data even though we don't show these fields
  useEffect(() => {
    if (formData.organization_id && !editingOrg) {
      const selectedOrg = organizations.find(o => o.id === formData.organization_id);
      if (selectedOrg) {
        setFormData(prev => ({
          ...prev,
          iati_org_ref: selectedOrg.iati_org_id || prev.iati_org_ref,
          org_type: selectedOrg.Organisation_Type_Code || prev.org_type,
          narrative: selectedOrg.name
        }));
      }
    }
  }, [formData.organization_id, organizations, editingOrg]);

  // Helper functions for multilingual narratives
  const addNarrative = () => {
    setFormData(prev => ({
      ...prev,
      narratives: [...(prev.narratives || []), { lang: '', text: '' }]
    }));
  };

  const removeNarrative = (index: number) => {
    setFormData(prev => ({
      ...prev,
      narratives: prev.narratives?.filter((_, i) => i !== index) || []
    }));
  };

  const updateNarrative = (index: number, field: 'lang' | 'text', value: string) => {
    setFormData(prev => ({
      ...prev,
      narratives: prev.narratives?.map((narrative, i) => 
        i === index ? { ...narrative, [field]: value } : narrative
      ) || []
    }));
  };

  const handleRoleChange = (roleCode: string) => {
    // The role value now comes as just the code (e.g., "3")
    const code = parseInt(roleCode);
    
    // Use the mapping from IATI code to role_type
    const codeToRoleType: Record<number, string> = {
      1: 'funding',
      2: 'government',  // Accountable maps to government
      3: 'extending',
      4: 'implementing'
    };
    
    const roleType = codeToRoleType[code] || 'implementing';
    
    console.log('[ParticipatingOrgModal] Role changed:', { roleCode, code, roleType });
    
    setFormData(prev => ({
      ...prev,
      role_type: roleType as any,
      iati_role_code: code
    }));
  };

  // Validation functions
  const validateLanguageCode = (lang: string): boolean => {
    return /^[a-z]{2}$/.test(lang);
  };

  const validateIATIId = (id: string): boolean => {
    return /^[A-Z]{2}-[A-Z0-9]{3,}-[A-Z0-9-]+$/.test(id);
  };

  const handleSubmit = async () => {
    if (!formData.organization_id || !formData.role_type) {
      toast.error('Please select an organization and role');
      return;
    }

    // Validate multilingual narratives
    if (formData.narratives?.length) {
      for (const narrative of formData.narratives) {
        if (narrative.lang && !validateLanguageCode(narrative.lang)) {
          toast.error(`Invalid language code: ${narrative.lang}. Must be 2 lowercase letters (ISO 639-1).`);
          return;
        }
        if (narrative.text && !narrative.lang) {
          toast.error('Language code is required when providing a multilingual name.');
          return;
        }
      }
    }

    // Validate IATI IDs
    if (formData.org_activity_id && !validateIATIId(formData.org_activity_id)) {
      toast.error('Invalid Activity ID format. Must match IATI ID pattern: XX-XXX-XXXXX');
      return;
    }

    if (formData.reporting_org_ref && !validateIATIId(formData.reporting_org_ref)) {
      toast.error('Invalid Reporting Organisation Reference format. Must match IATI ID pattern: XX-XXX-XXXXX');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData as ParticipatingOrgData);
      onClose();
    } catch (error) {
      console.error('Error saving participating organization:', error);
      toast.error('Failed to save organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-visible">
        <DialogHeader>
          <DialogTitle>
            {editingOrg ? 'Edit Participating Organization' : 'Add Participating Organization'}
          </DialogTitle>
          <DialogDescription>
            Select an organization and assign their role in this activity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Organization Selection */}
          <div className="space-y-2">
            <Label htmlFor="organization" className="flex items-center gap-2">
              Organization <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 align-middle" aria-hidden="true" />
              <HelpTextTooltip content="Select an existing organization from your database. Can't find your organization? Add it in the Organizations page first." />
            </Label>
            <OrganizationCombobox
              value={formData.organization_id || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
              organizations={organizations}
              placeholder="Search for an organization..."
              disabled={orgsLoading}
              open={activeDropdown === 'organization'}
              onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'organization' : null)}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              Organization Role <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 align-middle" aria-hidden="true" />
              <HelpTextTooltip content="The role of the organization in this activity according to IATI standard: Funding (provides funds), Accountable (legal responsibility), Extending (manages on behalf of funder), or Implementing (physically carries out)." />
            </Label>
            <EnhancedSearchableSelect
              groups={[{
                label: "Organization Roles",
                options: IATI_ORGANIZATION_ROLES.map(r => ({
                  code: r.code.toString(),
                  name: r.name,
                  description: r.description
                }))
              }]}
              value={formData.iati_role_code ? String(formData.iati_role_code) : ''}
              onValueChange={handleRoleChange}
              placeholder="Select role..."
              searchPlaceholder="Search roles..."
              open={activeDropdown === 'role'}
              onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'role' : null)}
            />
          </div>

          {/* Advanced Fields Toggle */}
          <div
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800 transition-colors py-2"
          >
            <span>Advanced IATI Fields</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>

          {showAdvanced && (
            <div className="space-y-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                These optional fields provide additional IATI-compliant metadata for specialized reporting requirements.
              </p>

              {/* Activity ID */}
              <div className="space-y-2">
                <Label htmlFor="org_activity_id" className="flex items-center gap-2">
                  Activity ID (Organisation's Own Reference)
                </Label>
                <p className="text-sm text-gray-600">
                  Identifier used by this participating organisation for the same activity in their own IATI dataset.
                </p>
                <Input
                  id="org_activity_id"
                  value={formData.org_activity_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, org_activity_id: e.target.value }))}
                  placeholder="AA-AAA-123456789-1234"
                />
              </div>

              {/* Activity ID Reference */}
              <div className="space-y-2">
                <Label htmlFor="activity_id_ref" className="flex items-center gap-2">
                  Related Activity IATI Identifier
                  <HelpTextTooltip content="The IATI identifier of a related activity if the organization also reports it. This corresponds to the @activity-id attribute in IATI XML." />
                </Label>
                <Input
                  id="activity_id_ref"
                  value={formData.activity_id_ref || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, activity_id_ref: e.target.value }))}
                  placeholder="e.g., GB-COH-1234567-PROJ001"
                />
              </div>

              {/* DAC CRS Reporting */}
              <div className="space-y-2">
                <Label htmlFor="crs_channel_code" className="flex items-center gap-2">
                  DAC CRS Reporting
                  <HelpTextTooltip content="OECD-DAC CRS (Creditor Reporting System) channel code, used mainly by bilateral donors for reporting to the DAC. This corresponds to the @crs-channel-code attribute." />
                </Label>
                <EnhancedSearchableSelect
                  groups={[
                    {
                      label: "Not Specified",
                      options: [
                        { code: "", name: "Not specified", description: "CRS channel code not specified or not applicable" }
                      ]
                    },
                    {
                      label: "Public Sector Institutions (10000)",
                      options: IATI_CRS_CHANNEL_CODES
                        .filter(code => code.category === "Public Sector" || code.category === "10000")
                        .map(code => ({
                          code: code.code,
                          name: code.name,
                          description: code.description || ''
                        }))
                    },
                    {
                      label: "NGOs and Civil Society (20000)",
                      options: IATI_CRS_CHANNEL_CODES
                        .filter(code => code.category === "Civil Society" || code.category === "20000" || code.category === "21000" || code.category === "22000" || code.category === "23000")
                        .map(code => ({
                          code: code.code,
                          name: code.name,
                          description: code.description || ''
                        }))
                    },
                    {
                      label: "Public-Private Partnerships (30000)",
                      options: IATI_CRS_CHANNEL_CODES
                        .filter(code => code.category === "Partnerships" || code.category === "30000" || code.category === "31000" || code.category === "32000")
                        .map(code => ({
                          code: code.code,
                          name: code.name,
                          description: code.description || ''
                        }))
                    },
                    {
                      label: "Multilateral Organisations (40000)",
                      options: IATI_CRS_CHANNEL_CODES
                        .filter(code => code.category === "Multilateral" || code.category === "40000" || code.category === "41000" || code.category === "42000" || code.category === "43000" || code.category === "44000" || code.category === "45000" || code.category === "46000" || code.category === "47000")
                        .map(code => ({
                          code: code.code,
                          name: code.name,
                          description: code.description || ''
                        }))
                    },
                    {
                      label: "Academic and Research (51000)",
                      options: IATI_CRS_CHANNEL_CODES
                        .filter(code => code.category === "Academic" || code.category === "51000")
                        .map(code => ({
                          code: code.code,
                          name: code.name,
                          description: code.description || ''
                        }))
                    },
                    {
                      label: "Private Sector Institutions (60000)",
                      options: IATI_CRS_CHANNEL_CODES
                        .filter(code => code.category === "Private Sector" || code.category === "60000" || code.category === "61000" || code.category === "62000" || code.category === "63000")
                        .map(code => ({
                          code: code.code,
                          name: code.name,
                          description: code.description || ''
                        }))
                    },
                    {
                      label: "Other (90000)",
                      options: IATI_CRS_CHANNEL_CODES
                        .filter(code => code.category === "Other" || code.category === "90000")
                        .map(code => ({
                          code: code.code,
                          name: code.name,
                          description: code.description || ''
                        }))
                    }
                  ]}
                  value={formData.crs_channel_code || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, crs_channel_code: value }))}
                  placeholder="Select CRS channel code..."
                  searchPlaceholder="Search channel codes..."
                />
              </div>

              {/* Multilingual Names */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  Multilingual Names
                  <HelpTextTooltip content="Each narrative corresponds to a translated organisation name." />
                </Label>
                <p className="text-sm text-gray-600">
                  Enter additional organisation names in other languages (ISO 639-1).
                </p>
                
                {formData.narratives?.map((narrative, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="w-32">
                        <Label htmlFor={`narrative-lang-${index}`} className="text-xs text-gray-500">
                          Language Code
                        </Label>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`narrative-text-${index}`} className="text-xs text-gray-500">
                          Name
                        </Label>
                      </div>
                      <div className="w-8"></div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="w-32">
                        <EnhancedSearchableSelect
                          groups={[{
                            label: "Languages",
                            options: LANGUAGES[0].types.map(lang => ({
                              code: lang.code,
                              name: lang.name
                            }))
                          }]}
                          value={narrative.lang}
                          onValueChange={(value) => updateNarrative(index, 'lang', value)}
                          placeholder="Select language..."
                          searchPlaceholder="Search languages..."
                          className="h-10"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          id={`narrative-text-${index}`}
                          value={narrative.text}
                          onChange={(e) => updateNarrative(index, 'text', e.target.value)}
                          placeholder="Nom de l'agence"
                          className="text-sm h-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeNarrative(index)}
                        className="px-2 py-1 h-10"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNarrative}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  Add Language
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.organization_id || !formData.role_type || saving}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editingOrg ? 'Update' : 'Save'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
