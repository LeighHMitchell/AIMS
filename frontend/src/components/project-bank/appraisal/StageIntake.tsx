"use client"

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from '@/components/ui/help-text-tooltip';
import { RequiredDot } from '@/components/ui/required-dot';
import { DatePicker } from '@/components/ui/date-picker';
import { apiFetch } from '@/lib/api-fetch';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { useComplianceRules } from '@/hooks/use-compliance-rules';
import { cn } from '@/lib/utils';
import { AlertTriangle, ShieldAlert, Check, Upload, X, Move, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { MYANMAR_REGIONS } from '@/data/myanmar-regions';
import SDGIconHover from '@/components/ui/SDGIconHover';
import { StageMSDPScreening } from './StageMSDPScreening';
import { FieldCheck } from './FieldCheck';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CurrencySelector } from '@/components/forms/CurrencySelector';
import type { PendingFile } from '@/hooks/use-appraisal-wizard';

const SDG_GOALS = Array.from({ length: 17 }, (_, i) => ({
  value: String(i + 1),
  label: `SDG ${i + 1}`,
}));


/** Currency formatter for display */
function formatCurrencyDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '';
  return new Intl.NumberFormat('en-US').format(value);
}

interface StageIntakeProps {
  wizard: UseAppraisalWizardReturn;
}

interface Ministry {
  id: string;
  name: string;
  code?: string;
  acronym?: string;
  parentId?: string;
  level: number;
}

interface PBProjectType {
  id: string;
  code: string;
  name: string;
}

interface PBSector {
  id: string;
  code: string;
  name: string;
  sub_sectors: { id: string; name: string }[];
}

// Group Myanmar regions by type
const regionStates = MYANMAR_REGIONS.filter(r => r.type === 'State');
const regionRegions = MYANMAR_REGIONS.filter(r => r.type === 'Region');
const regionUnionTerritories = MYANMAR_REGIONS.filter(r => r.type === 'Union Territory');

export function StageIntake({ wizard }: StageIntakeProps) {
  const { formData, updateField, errors, projectId, documents, refreshDocuments, pendingFiles, setPendingFiles, isLocked } = wizard;
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [ministriesLoading, setMinistriesLoading] = useState(true);
  const [costDisplay, setCostDisplay] = useState(() => formatCurrencyDisplay(formData.estimated_cost));
  const [projectTypes, setProjectTypes] = useState<PBProjectType[]>([]);
  const [projectTypesLoading, setProjectTypesLoading] = useState(true);
  const [sectors, setSectors] = useState<PBSector[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(true);

  const { validateMinimumSize } = useComplianceRules();
  const minSizeResult = validateMinimumSize(formData.estimated_cost, formData.currency || 'USD');

  // Cascading sub-sectors from DB sectors
  const selectedSector = sectors.find(s => s.name === formData.sector);
  const sectorSubSectors = selectedSector?.sub_sectors || [];

  // Top-level ministries (level 1) for Nominating Ministry dropdown
  const topLevelMinistries = ministries.filter(m => m.level === 1 || !m.parentId);

  // Find the selected nominating ministry and get its children for Implementing Agency
  const selectedMinistry = ministries.find(m => m.name === formData.nominating_ministry);
  const getAllDescendants = (parentId: string): Ministry[] => {
    const children = ministries.filter(m => m.parentId === parentId);
    return children.reduce<Ministry[]>((acc, child) => [...acc, child, ...getAllDescendants(child.id)], []);
  };
  const agencyOptions = selectedMinistry ? getAllDescendants(selectedMinistry.id) : [];

  const isUnsolicited = formData.origin === 'unsolicited';

  // Fetch all administrative classifications (ministries + departments/offices) from Chart of Accounts
  useEffect(() => {
    async function fetchMinistries() {
      try {
        const res = await apiFetch('/api/admin/budget-classifications?type=administrative&flat=true&activeOnly=true');
        if (res.ok) {
          const json = await res.json();
          const items = json.data || json;
          setMinistries(items.map((m: any) => ({ id: m.id, name: m.name, code: m.code, acronym: m.acronym, parentId: m.parentId, level: m.level ?? 1 })));
        }
      } catch {} finally { setMinistriesLoading(false); }
    }
    fetchMinistries();
  }, []);

  // Fetch project types from DB
  useEffect(() => {
    async function fetchProjectTypes() {
      try {
        const res = await apiFetch('/api/pb-project-types');
        if (res.ok) setProjectTypes(await res.json());
      } catch {} finally { setProjectTypesLoading(false); }
    }
    fetchProjectTypes();
  }, []);

  // Fetch sectors from DB
  useEffect(() => {
    async function fetchSectors() {
      try {
        const res = await apiFetch('/api/pb-sectors');
        if (res.ok) setSectors(await res.json());
      } catch {} finally { setSectorsLoading(false); }
    }
    fetchSectors();
  }, []);

  // Duration: free-form years + months, store total months in DB, show normalized summary
  const [durYears, setDurYears] = useState<string>(() => {
    const m = formData.estimated_duration_months;
    return m != null ? String(Math.floor(m / 12)) : '';
  });
  const [durMonths, setDurMonths] = useState<string>(() => {
    const m = formData.estimated_duration_months;
    return m != null ? String(m % 12) : '';
  });

  const commitDuration = (years: string, months: string) => {
    const y = years === '' ? 0 : parseInt(years) || 0;
    const m = months === '' ? 0 : parseInt(months) || 0;
    const total = y * 12 + m;
    updateField('estimated_duration_months', total > 0 ? total : null);
  };

  // Normalized display for the gray summary
  const totalDurationMonths = (parseInt(durYears) || 0) * 12 + (parseInt(durMonths) || 0);

  const handleCostChange = (value: string, inputEl?: HTMLInputElement) => {
    // Strip non-numeric chars except decimal point
    const stripped = value.replace(/[^0-9.]/g, '');
    const raw = parseFloat(stripped);
    updateField('estimated_cost', isNaN(raw) ? null : raw);

    // Format with commas while preserving cursor position
    const formatted = stripped ? formatCurrencyDisplay(parseFloat(stripped) || 0) || stripped : '';
    const prevLen = value.length;
    setCostDisplay(formatted);

    if (inputEl) {
      const cursorPos = inputEl.selectionStart || 0;
      const diff = formatted.length - prevLen;
      requestAnimationFrame(() => {
        const newPos = Math.max(0, cursorPos + diff);
        inputEl.setSelectionRange(newPos, newPos);
      });
    }
  };

  const handleCostBlur = () => {
    setCostDisplay(formatCurrencyDisplay(formData.estimated_cost));
  };

  return (
    <div className={cn('space-y-6', isLocked && 'pointer-events-none opacity-60')}>
      {/* Page header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Project Intake</h3>
        {formData.project_code && (
          <p className="text-xs text-muted-foreground font-mono mb-1">{formData.project_code}</p>
        )}
        <p className="text-sm text-muted-foreground">Enter basic project information and contact details.</p>
      </div>

      {/* ─── Banner Image Upload ─── */}
      <div>
        <Label className="mb-2 block">
          Project Banner
          <HelpTooltip text="Upload a banner image (recommended 1200×300 pixels) to visually represent this project. It will appear on the project profile page." />
          <FieldCheck value={formData.banner} />
        </Label>
        {formData.banner ? (
          <div className="relative h-48 rounded-lg overflow-hidden group">
            <img
              src={formData.banner}
              alt="Project banner"
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${formData.banner_position ?? 50}%` }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return; }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      updateField('banner', reader.result as string);
                      updateField('banner_position', 50);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Button size="sm" variant="secondary" asChild>
                  <span><Upload className="h-4 w-4 mr-1.5" />Replace</span>
                </Button>
              </label>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => { updateField('banner', null); updateField('banner_position', 50); }}
              >
                <X className="h-4 w-4 mr-1.5" />Remove
              </Button>
            </div>
          </div>
        ) : (
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return; }
                const reader = new FileReader();
                reader.onloadend = () => {
                  updateField('banner', reader.result as string);
                  updateField('banner_position', 50);
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            <div className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-colors">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">Click or drag image to upload</p>
              <p className="text-xs text-gray-500">Max size: 5 MB</p>
            </div>
          </label>
        )}
      </div>

      {/* ─── C: Project Origin — Two-Card Layout ─── */}
      <div id="section-origin" className="scroll-mt-20 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Project Origin</h4>
        <div className="flex gap-4">
          {/* GOV card */}
          <button
            type="button"
            onClick={() => updateField('origin', 'government')}
            className={cn(
              'relative flex flex-col justify-end w-[260px] h-[200px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
              (formData.origin || 'government') === 'government'
                ? 'ring-border bg-primary/5'
                : 'ring-border bg-background hover:bg-gray-50',
            )}
          >
            <Image src="/images/origin-government.png" alt="Government Nominated" fill className="object-contain object-bottom object-left opacity-15 scale-75 origin-bottom-left" />
            {(formData.origin || 'government') === 'government' && (
              <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="relative z-10 p-3">
              <h4 className="text-sm font-semibold">Government Nominated <span className="text-[10px] font-mono font-normal bg-muted px-1.5 py-0.5 rounded align-middle">GOV</span></h4>
              <p className="mt-1 text-xs text-muted-foreground">Nominated by a government ministry</p>
            </div>
          </button>

          {/* UNSOL card */}
          <button
            type="button"
            onClick={() => updateField('origin', 'unsolicited')}
            className={cn(
              'relative flex flex-col justify-end w-[260px] h-[200px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
              formData.origin === 'unsolicited'
                ? 'ring-border bg-primary/5'
                : 'ring-border bg-background hover:bg-gray-50',
            )}
          >
            <Image src="/images/origin-unsolicited.png" alt="Unsolicited Proposal" fill className="object-contain object-bottom object-left opacity-15 scale-75 origin-bottom-left" />
            {formData.origin === 'unsolicited' && (
              <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="relative z-10 p-3">
              <h4 className="text-sm font-semibold">Unsolicited Proposal <span className="text-[10px] font-mono font-normal bg-muted px-1.5 py-0.5 rounded align-middle">UNSOL</span></h4>
              <p className="mt-1 text-xs text-muted-foreground">Proposed by a private entity or partner</p>
            </div>
          </button>
        </div>

        {/* Contact Officer (shown when GOV) */}
        {!isUnsolicited && (
          <div className="p-3 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
            <h5 className="text-sm font-medium text-foreground">Contact Officer</h5>
            <p className="text-xs text-muted-foreground -mt-1">The government officer responsible for coordinating this project.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">First Name <FieldCheck value={formData.contact_officer_first_name} /></Label>
                <Input
                  value={formData.contact_officer_first_name || ''}
                  onChange={e => updateField('contact_officer_first_name', e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Name <FieldCheck value={formData.contact_officer_last_name} /></Label>
                <Input
                  value={formData.contact_officer_last_name || ''}
                  onChange={e => updateField('contact_officer_last_name', e.target.value)}
                  placeholder="Last name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Position / Job Title <FieldCheck value={formData.contact_position} /></Label>
                <Input
                  value={formData.contact_position || ''}
                  onChange={e => updateField('contact_position', e.target.value)}
                  placeholder="e.g. Director, Project Manager"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ministry <FieldCheck value={formData.contact_ministry} /></Label>
                <Select
                  value={formData.contact_ministry || ''}
                  onValueChange={v => {
                    updateField('contact_ministry', v);
                    updateField('contact_department', '');
                  }}
                  disabled={ministriesLoading || topLevelMinistries.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ministriesLoading ? 'Loading...' : 'Select ministry...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {topLevelMinistries.map(m => (
                      <SelectItem key={m.id} value={m.name}>
                        <span className="inline-flex items-center gap-2 min-w-0">
                          {m.code && <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m.code}</span>}
                          <span>{m.name}{m.acronym ? ` (${m.acronym})` : ''}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Department <FieldCheck value={formData.contact_department} /></Label>
                {(() => {
                  const contactMin = ministries.find(m => m.name === formData.contact_ministry);
                  const depts = contactMin ? getAllDescendants(contactMin.id) : [];
                  return (
                    <Select
                      value={formData.contact_department || ''}
                      onValueChange={v => updateField('contact_department', v)}
                      disabled={!formData.contact_ministry || depts.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !formData.contact_ministry ? 'Select ministry first'
                            : depts.length === 0 ? 'No departments found'
                            : 'Select department...'
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {depts.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email <FieldCheck value={formData.contact_email} /></Label>
                <Input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={e => updateField('contact_email', e.target.value)}
                  placeholder="email@gov.mm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone <FieldCheck value={formData.contact_phone} /></Label>
                <Input
                  value={formData.contact_phone || ''}
                  onChange={e => {
                    // Strip non-digit characters except leading +
                    const raw = e.target.value.replace(/[^\d+]/g, '');
                    // Format in groups of 3: +95 123 456 789
                    const digits = raw.startsWith('+') ? raw.slice(1) : raw;
                    const prefix = raw.startsWith('+') ? '+' : '';
                    const formatted = prefix + digits.replace(/(\d{3})(?=\d)/g, '$1 ');
                    updateField('contact_phone', formatted);
                  }}
                  placeholder="+95 123 456 789"
                />
              </div>
            </div>
          </div>
        )}

        {/* Proponent Details (shown when UNSOL) */}
        {isUnsolicited && (
          <div className="p-3 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
            <h5 className="text-sm font-medium text-foreground">Proponent Details</h5>
            <p className="text-xs text-muted-foreground -mt-1">The primary contact from the proposing entity.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">First Name <FieldCheck value={formData.proponent_first_name} /></Label>
                <Input
                  value={formData.proponent_first_name || ''}
                  onChange={e => updateField('proponent_first_name', e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Name <FieldCheck value={formData.proponent_last_name} /></Label>
                <Input
                  value={formData.proponent_last_name || ''}
                  onChange={e => updateField('proponent_last_name', e.target.value)}
                  placeholder="Last name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Company <FieldCheck value={formData.proponent_company} /></Label>
                <Input
                  value={formData.proponent_company || ''}
                  onChange={e => updateField('proponent_company', e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contact Info <FieldCheck value={formData.proponent_contact} /></Label>
                <Input
                  value={formData.proponent_contact || ''}
                  onChange={e => updateField('proponent_contact', e.target.value)}
                  placeholder="Email or phone"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── B: General Info with "Basic Information" heading ─── */}
      <div id="section-general-info" className="scroll-mt-20 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Project Name <RequiredDot /> <HelpTooltip text="The official name of the project. Use a clear, descriptive title." /> <FieldCheck value={formData.name} /></Label>
            <Input
              value={formData.name || ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g. Mandalay–Myitkyina Highway"
            />
          </div>

          {/* D: Nominating Ministry — Top-level ministries only */}
          <div>
            <Label>Nominating Ministry <RequiredDot /> <HelpTooltip text="The government ministry responsible for proposing this project." /> <FieldCheck value={formData.nominating_ministry} /></Label>
            <SearchableSelect
              options={topLevelMinistries.map(m => ({
                value: m.name,
                label: m.acronym ? `${m.name} (${m.acronym})` : m.name,
                code: m.code,
              }))}
              value={formData.nominating_ministry || ''}
              onValueChange={v => {
                updateField('nominating_ministry', v);
                updateField('implementing_agency', '');
              }}
              placeholder={
                ministriesLoading ? 'Loading ministries...'
                  : topLevelMinistries.length === 0 ? 'No ministries available'
                  : 'Select ministry...'
              }
              searchPlaceholder="Search ministries..."
              emptyText="No ministries found."
              disabled={ministriesLoading || topLevelMinistries.length === 0}
              showValueCode={false}
            />
          </div>

          {/* E: Implementing Agency — cascades from nominating ministry children */}
          <div>
            <Label>Implementing Agency <HelpTooltip text="The department, directorate, or office within the nominating ministry that will implement the project. Select a ministry first." /> <FieldCheck value={formData.implementing_agency} /></Label>
            <Select
              value={formData.implementing_agency || ''}
              onValueChange={v => updateField('implementing_agency', v)}
              disabled={!formData.nominating_ministry || agencyOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.nominating_ministry ? 'Select a ministry first'
                    : agencyOptions.length === 0 ? 'No departments found — ministry is the implementer'
                    : 'Select implementing agency...'
                } />
              </SelectTrigger>
              <SelectContent>
                {agencyOptions.map(m => (
                  <SelectItem key={m.id} value={m.name}>
                    <span className="inline-flex items-center gap-2 min-w-0">
                      {m.code && <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m.code}</span>}
                      <span className={m.level > 2 ? 'pl-3' : ''}>{m.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* F: Project Type — from DB with [CODE] Name */}
          <div>
            <Label>Project Type <HelpTooltip text="The broad category of this project (infrastructure, social services, etc.)." /> <FieldCheck value={formData.project_type} /></Label>
            <Select
              value={formData.project_type || ''}
              onValueChange={v => updateField('project_type', v)}
              disabled={projectTypesLoading && projectTypes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={projectTypesLoading ? 'Loading types...' : 'Select type...'} />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map(t => (
                  <SelectItem key={t.id} value={t.name}>
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.code}</span>
                      <span>{t.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estimated Cost <HelpTooltip text="The total estimated project cost including all phases." /> <FieldCheck value={formData.estimated_cost} /></Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                <Input
                  value={costDisplay}
                  onChange={e => handleCostChange(e.target.value, e.target)}
                  onBlur={handleCostBlur}
                  placeholder="e.g. 85,000,000"
                  className="pl-7"
                />
              </div>
              <CurrencySelector
                value={formData.currency || 'USD'}
                onValueChange={v => updateField('currency', v || 'USD')}
                showCodeOnly
                className="w-[110px] pb-0"
              />
            </div>
          </div>

          {/* Minimum project size compliance warning */}
          {minSizeResult && !minSizeResult.passed && (
            <div className={cn(
              "md:col-span-2 flex items-start gap-2 p-3 rounded-lg border text-sm",
              minSizeResult.enforcement === 'enforce'
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            )}>
              {minSizeResult.enforcement === 'enforce' ? (
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{minSizeResult.message}</span>
            </div>
          )}

          <div>
            <Label>Estimated Start Date <HelpTooltip text="When the project is expected to begin." /> <FieldCheck value={formData.estimated_start_date} /></Label>
            <DatePicker
              value={formData.estimated_start_date || ''}
              onChange={v => updateField('estimated_start_date', v || null)}
              placeholder="Pick a start date"
            />
          </div>

          {/* Duration Input — free-form, with normalized summary */}
          <div>
            <Label>Estimated Duration <HelpTooltip text="Total project duration from start to completion. Enter years and months freely — the total is calculated automatically." /> <FieldCheck value={formData.estimated_duration_months} /></Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={0}
                value={durYears}
                onChange={e => {
                  setDurYears(e.target.value);
                  commitDuration(e.target.value, durMonths);
                }}
                onFocus={e => setTimeout(() => e.target.select(), 0)}
                placeholder="0"
                className="w-20"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">years</span>
              <Input
                type="number"
                min={0}
                value={durMonths}
                onChange={e => {
                  setDurMonths(e.target.value);
                  commitDuration(durYears, e.target.value);
                }}
                onFocus={e => setTimeout(() => e.target.select(), 0)}
                placeholder="0"
                className="w-20"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">months</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Description <HelpTooltip text="A brief summary of the project scope and purpose." /> <FieldCheck value={formData.description} /></Label>
            <Textarea
              value={formData.description || ''}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Brief project summary..."
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Objectives <HelpTooltip text="The specific goals this project aims to achieve." /> <FieldCheck value={formData.objectives} /></Label>
            <Textarea
              value={formData.objectives || ''}
              onChange={e => updateField('objectives', e.target.value)}
              placeholder="What are the main objectives of this project?"
              rows={2}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Target Beneficiaries <HelpTooltip text="Who will benefit from this project and how many people are expected to be impacted." /> <FieldCheck value={formData.target_beneficiaries} /></Label>
            <Textarea
              value={formData.target_beneficiaries || ''}
              onChange={e => updateField('target_beneficiaries', e.target.value)}
              placeholder="Who will benefit from this project?"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Contact Officer section removed — now inline under Project Origin */}
      <div id="section-contact-officer" className="scroll-mt-20" />

      {/* ─── G: Sector / Sub-Sector — from DB, no border/bg ─── */}
      <div id="section-sector" className="scroll-mt-20 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sector / Sub-Sector</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Sector <RequiredDot /> <HelpTooltip text="The primary development sector this project falls under." /> <FieldCheck value={formData.sector} /></Label>
            <SearchableSelect
              options={sectors.map(s => ({
                value: s.name,
                label: s.name,
                code: s.code,
              }))}
              value={formData.sector || ''}
              onValueChange={v => { updateField('sector', v || ''); updateField('sub_sector', null); }}
              placeholder={sectorsLoading ? 'Loading sectors...' : 'Select sector...'}
              searchPlaceholder="Search sectors..."
              emptyText="No sectors found."
              disabled={sectorsLoading && sectors.length === 0}
              showValueCode={false}
              clearable
            />
          </div>
          <div>
            <Label>Sub-Sector <HelpTooltip text="A more specific category within the selected sector." /> <FieldCheck value={formData.sub_sector} /></Label>
            <div className="relative">
              <Select
                value={formData.sub_sector || ''}
                onValueChange={v => updateField('sub_sector', v)}
                disabled={!sectorSubSectors.length}
              >
                <SelectTrigger className={formData.sub_sector ? 'pr-8' : ''}>
                  <SelectValue placeholder={sectorSubSectors.length ? 'Select sub-sector...' : 'Select sector first'} />
                </SelectTrigger>
              <SelectContent>
                {sectorSubSectors.map((s, idx) => (
                  <SelectItem key={s.id} value={s.name}>
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{idx + 1}</span>
                      <span>{s.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
              {formData.sub_sector && (
                <button
                  type="button"
                  onClick={() => updateField('sub_sector', null)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center"
                  aria-label="Clear sub-sector"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── J: Region / Townships — Grouped by type + Nationwide ─── */}
      <div id="section-region" className="scroll-mt-20 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Region / Townships</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Region <HelpTooltip text="The state or region where this project will be implemented." /> <FieldCheck value={formData.region} /></Label>
            <Select value={formData.region || ''} onValueChange={v => updateField('region', v)}>
              <SelectTrigger><SelectValue placeholder="Select region..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Nationwide">
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ALL</span>
                    <span>Nationwide</span>
                  </span>
                </SelectItem>
                <SelectGroup>
                  <SelectLabel>States</SelectLabel>
                  {regionStates.map(r => (
                    <SelectItem key={r.name} value={r.name}>
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{r.st_pcode.replace('MMR', '')}</span>
                        <span>{r.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Regions</SelectLabel>
                  {regionRegions.map(r => (
                    <SelectItem key={r.name} value={r.name}>
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{r.st_pcode.replace('MMR', '')}</span>
                        <span>{r.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Union Territories</SelectLabel>
                  {regionUnionTerritories.map(r => (
                    <SelectItem key={r.name} value={r.name}>
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{r.st_pcode.replace('MMR', '')}</span>
                        <span>{r.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── K: SDG Goals — Bloom Animation ─── */}
      <div className="md:col-span-2">
        <Label>SDG Goals <HelpTooltip text="Select the Sustainable Development Goals this project contributes to." /> <FieldCheck value={formData.sdg_goals} /></Label>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 mt-2">
          {SDG_GOALS.map(sdg => {
            const selected = (formData.sdg_goals || []).includes(sdg.value);
            const padded = sdg.value.padStart(2, '0');
            return (
              <button
                key={sdg.value}
                type="button"
                onClick={() => {
                  const current = formData.sdg_goals || [];
                  updateField(
                    'sdg_goals',
                    selected ? current.filter((g: string) => g !== sdg.value) : [...current, sdg.value]
                  );
                }}
                className={cn(
                  'relative aspect-square rounded-lg border-2 transition-all overflow-hidden',
                  selected
                    ? 'border-gray-800 ring-2 ring-gray-800/20 shadow-md'
                    : 'border-transparent',
                )}
              >
                <SDGIconHover
                  src={`/images/sdg/E_SDG_Icons-${padded}.jpg`}
                  alt={`SDG ${sdg.value}`}
                  size="lg"
                  selected={selected}
                  className="w-full h-full"
                />
                {selected && (
                  <div className="absolute bottom-0.5 right-0.5 bg-gray-800 rounded-full p-0.5">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── L: MSDP Alignment Screening ─── */}
      <div className="md:col-span-2" id="section-msdp">
        <StageMSDPScreening wizard={wizard} />
      </div>

      {/* Document upload with pre-save staging */}
      <div>
        <Label className="mb-2 block">Supporting Documents</Label>
        <DocumentUploadZone
          projectId={projectId}
          stage="intake"
          documents={documents}
          onDocumentsChange={refreshDocuments}
          acceptedTypes={['concept_note', 'project_proposal', 'terms_of_reference', 'budget_estimate', 'site_map', 'stakeholder_analysis', 'endorsement_letter', 'proponent_profile', 'environmental_screening', 'other']}
          pendingFiles={pendingFiles}
          onPendingFilesChange={setPendingFiles}
        />
      </div>

    </div>
  );
}
