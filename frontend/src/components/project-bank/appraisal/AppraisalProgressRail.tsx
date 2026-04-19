"use client"

import { Check, Lock, Clock, ChevronRight, RotateCcw, XCircle, ShieldCheck, Copy } from 'lucide-react';
import type { AppraisalStage, ProjectStage, ProjectPhase, FS1Tab, FS2Tab, CategoryDecision } from '@/types/project-bank';
import { PHASE_LABELS, FS1_TAB_LABELS, FS2_TAB_LABELS, getPhase, getGateStatus, getFs3Label, getFs3Description } from '@/lib/project-bank-utils';
import type { GateStatus } from '@/lib/project-bank-utils';
import { cn } from '@/lib/utils';

/** Sub-items for the Intake phase that can be scrolled to */
const INTAKE_SUB_ITEMS = [
  { label: 'General Information', anchor: 'section-general-info' },
  { label: 'Contact Officer', anchor: 'section-contact-officer' },
  { label: 'Sector / Sub-Sector', anchor: 'section-sector' },
  { label: 'Region / Townships', anchor: 'section-region' },
  { label: 'MSDP Alignment', anchor: 'section-msdp' },
];

/** FS-1 tabs */
const FS1_TABS: { key: FS1Tab; label: string }[] = [
  { key: 'technical', label: 'Technical' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'environmental', label: 'Environmental' },
  { key: 'msdp', label: 'MSDP Alignment' },
  { key: 'firr', label: 'Financial Analysis' },
];

/** FS-2 tabs */
const FS2_TABS: { key: FS2Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'demand', label: 'Demand' },
  { key: 'technical', label: 'Technical' },
  { key: 'financial', label: 'FIRR' },
  { key: 'economic', label: 'EIRR' },
  { key: 'environmental', label: 'Environmental' },
  { key: 'risk', label: 'Risk' },
  { key: 'implementation', label: 'Implementation' },
];

interface GateIndicatorProps {
  status: GateStatus;
}

function GateIndicator({ status }: GateIndicatorProps) {
  const configs: Record<GateStatus, { icon: typeof Clock; label: string; textClass: string; bgClass: string }> = {
    locked: { icon: Lock, label: 'Requires review board approval', textClass: 'text-muted-foreground', bgClass: 'bg-muted' },
    awaiting_review: { icon: Clock, label: 'Awaiting Review', textClass: 'text-foreground', bgClass: 'bg-muted' },
    approved: { icon: ShieldCheck, label: 'Approved', textClass: 'text-[hsl(var(--success-icon))]', bgClass: 'bg-green-50' },
    returned: { icon: RotateCcw, label: 'Returned', textClass: 'text-amber-600', bgClass: 'bg-amber-50' },
    rejected: { icon: XCircle, label: 'Rejected', textClass: 'text-destructive', bgClass: 'bg-destructive/10' },
  };
  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className="ml-[14px] my-4 flex items-center gap-2">
      <div className="w-0.5 h-5 bg-muted" />
      <div className={cn('flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full', config.bgClass, config.textClass)}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
    </div>
  );
}

interface AppraisalProgressRailProps {
  projectName?: string;
  projectCode?: string;
  visibleStages: AppraisalStage[];
  currentStage: AppraisalStage;
  projectStage: ProjectStage;
  currentPhase: ProjectPhase;
  fs1ActiveTab: FS1Tab;
  fs2ActiveTab?: FS2Tab;
  onStageClick: (stage: AppraisalStage) => void;
  onFs1TabClick: (tab: FS1Tab) => void;
  onFs2TabClick?: (tab: FS2Tab) => void;
  canGoToStage: (stage: AppraisalStage) => boolean;
  isStageComplete: (stage: AppraisalStage) => boolean;
  onReturnToCurrentPhase?: () => void;
  onPhaseClick?: (phase: ProjectPhase) => void;
  categoryDecision?: CategoryDecision | null;
}

export function AppraisalProgressRail({
  projectName,
  projectCode,
  visibleStages,
  currentStage,
  projectStage,
  currentPhase,
  fs1ActiveTab,
  fs2ActiveTab,
  onStageClick,
  onFs1TabClick,
  onFs2TabClick,
  canGoToStage,
  isStageComplete,
  onReturnToCurrentPhase,
  onPhaseClick,
  categoryDecision,
}: AppraisalProgressRailProps) {
  const handleSubItemClick = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const intakeGate = getGateStatus(projectStage, 'intake_to_fs1');
  const fs1Gate = getGateStatus(projectStage, 'fs1_to_fs2');

  const intakeActive = currentPhase === 'intake';
  const intakeComplete = currentPhase !== 'intake';
  const fs1Active = currentPhase === 'fs1';
  const fs1Complete = ['fs2', 'fs3'].includes(currentPhase);
  const fs1Accessible = intakeGate === 'approved';
  const fs2Active = currentPhase === 'fs2';
  const fs2Complete = currentPhase === 'fs3';
  const fs2Accessible = fs1Complete;
  const fs3Active = currentPhase === 'fs3';
  const fs3Accessible = fs2Complete;

  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden lg:block w-[240px] shrink-0">
        <div className="sticky top-24 space-y-3">
          {/* Project name + Phase header */}
          {projectName && (
            <div className="mb-4 pb-3 border-b border-border">
              <div
                className="group/name inline cursor-pointer"
                onClick={() => navigator.clipboard.writeText(projectName)}
                title="Copy project name"
              >
                <h3 className="text-xl font-bold text-foreground inline">
                  {projectName}
                </h3>
                <Copy className="h-3.5 w-3.5 text-muted-foreground inline-block ml-1 opacity-0 group-hover/name:opacity-100 transition-opacity align-middle" />
              </div>
              {projectCode && (
                <div
                  className="group/code inline-flex items-center gap-1 cursor-pointer mt-1"
                  onClick={() => navigator.clipboard.writeText(projectCode)}
                  title="Copy project code"
                >
                  <p className="font-mono text-sm text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {projectCode}
                  </p>
                  <Copy className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover/code:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          )}

          {/* ─── Phase 1: Project Intake ─── */}
          <div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => (intakeActive || intakeComplete) && onStageClick('intake')}
                  disabled={!intakeActive && !intakeComplete}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                    intakeComplete && 'bg-gray-800 border-gray-800 text-white',
                    intakeActive && !intakeComplete && 'border-gray-600 bg-muted text-foreground',
                    !intakeComplete && !intakeActive && 'border-input bg-background text-muted-foreground',
                    (intakeActive || intakeComplete) && 'cursor-pointer hover:scale-110',
                  )}
                >
                  {intakeComplete ? <Check className="h-3.5 w-3.5" /> : <span className={cn('w-2 h-2 rounded-full', intakeActive ? 'bg-gray-600' : 'bg-gray-300')} />}
                </button>
              </div>
              <button
                onClick={() => (intakeActive || intakeComplete) && onStageClick('intake')}
                disabled={!intakeActive && !intakeComplete}
                className={cn('text-left transition-colors', (intakeActive || intakeComplete) && 'cursor-pointer hover:text-foreground')}
              >
                <span className={cn(
                  'block text-body leading-snug',
                  intakeActive && 'font-semibold text-foreground',
                  intakeComplete && !intakeActive && 'text-muted-foreground',
                  !intakeComplete && !intakeActive && 'text-muted-foreground',
                )}>
                  {PHASE_LABELS.intake}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Basic project details and contact information
                </span>
              </button>
            </div>

            {/* Intake sub-items */}
            {intakeActive && (
              <div className={cn('ml-[14px] pl-[22px] border-l space-y-1 pt-1 pb-1', intakeComplete ? 'border-gray-600' : 'border-input')}>
                {INTAKE_SUB_ITEMS.map((sub) => (
                  <button
                    key={sub.anchor}
                    type="button"
                    onClick={() => handleSubItemClick(sub.anchor)}
                    className="block w-full text-left text-helper text-muted-foreground hover:text-foreground transition-colors py-1 pl-1"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Gate: Intake → FS-1 ─── */}
          <GateIndicator status={intakeGate} />

          {/* ─── Phase 2: FS-1 Preliminary Feasibility ─── */}
          <div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    if (fs1Active) onReturnToCurrentPhase?.();
                    else if (fs1Complete) onStageClick('preliminary_fs');
                  }}
                  disabled={!fs1Active && !fs1Complete}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                    fs1Complete && 'bg-gray-800 border-gray-800 text-white',
                    fs1Active && !fs1Complete && 'border-gray-600 bg-muted text-foreground',
                    !fs1Complete && !fs1Active && 'border-input bg-background text-muted-foreground',
                    !fs1Accessible && !fs1Active && !fs1Complete && 'opacity-40',
                    (fs1Active || fs1Complete) && 'cursor-pointer hover:scale-110',
                  )}
                >
                  {fs1Complete ? <Check className="h-3.5 w-3.5" /> :
                    !fs1Accessible && !fs1Active ? <Lock className="h-3 w-3 text-gray-300" /> :
                    <span className={cn('w-2 h-2 rounded-full', fs1Active ? 'bg-gray-600' : 'bg-gray-300')} />
                  }
                </button>
              </div>
              <button
                onClick={() => {
                  if (fs1Active) onReturnToCurrentPhase?.();
                  else if (fs1Complete) onStageClick('preliminary_fs');
                }}
                disabled={!fs1Active && !fs1Complete}
                className={cn(
                  'text-left transition-colors',
                  !fs1Accessible && !fs1Active && !fs1Complete && 'opacity-40',
                  (fs1Active || fs1Complete) && 'cursor-pointer hover:text-foreground',
                )}
              >
                <span className={cn(
                  'block text-body leading-snug',
                  fs1Active && 'font-semibold text-foreground',
                  fs1Complete && !fs1Active && 'text-muted-foreground',
                  !fs1Complete && !fs1Active && 'text-muted-foreground',
                )}>
                  {PHASE_LABELS.fs1}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Technical, financial, and environmental screening
                </span>
                <span className="block text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                  Unlocked after intake is approved by review board
                </span>
              </button>
            </div>

            {/* FS-1 internal tabs */}
            {fs1Active && (
              <div className={cn('ml-[14px] pl-[22px] border-l space-y-1 pt-1 pb-1', 'border-input')}>
                {FS1_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onFs1TabClick(tab.key)}
                    className={cn(
                      'block w-full text-left text-helper transition-colors py-1 pl-1',
                      fs1ActiveTab === tab.key
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Gate: FS-1 → FS-2 ─── */}
          {(fs1Active || fs1Complete || fs1Accessible) && (
            <GateIndicator status={fs1Gate} />
          )}

          {/* ─── Phase 3: FS-2 Detailed Feasibility ─── */}
          <div className={cn(!fs2Active && !fs2Complete && !fs2Accessible && 'opacity-40')}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    if (fs2Active) onReturnToCurrentPhase?.();
                    else if (fs2Complete) onPhaseClick?.('fs2');
                  }}
                  disabled={!fs2Active && !fs2Complete}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                    fs2Complete && 'bg-gray-800 border-gray-800 text-white',
                    fs2Active && !fs2Complete && 'border-gray-600 bg-muted text-foreground',
                    !fs2Complete && !fs2Active && 'border-input bg-background text-muted-foreground',
                    (fs2Active || fs2Complete) && 'cursor-pointer hover:scale-110',
                  )}
                >
                  {fs2Complete ? <Check className="h-3.5 w-3.5" /> :
                    !fs2Accessible && !fs2Active ? <Lock className="h-3 w-3 text-gray-300" /> :
                    <span className={cn('w-2 h-2 rounded-full', fs2Active ? 'bg-gray-600' : 'bg-gray-300')} />
                  }
                </button>
              </div>
              <button
                onClick={() => {
                  if (fs2Active) onReturnToCurrentPhase?.();
                  else if (fs2Complete) onPhaseClick?.('fs2');
                }}
                disabled={!fs2Active && !fs2Complete}
                className={cn(
                  'text-left transition-colors',
                  (fs2Active || fs2Complete) && 'cursor-pointer hover:text-foreground',
                )}
              >
                <span className={cn(
                  'block text-body leading-snug',
                  fs2Active && 'font-semibold text-foreground',
                  fs2Complete && !fs2Active && 'text-muted-foreground',
                  !fs2Complete && !fs2Active && 'text-muted-foreground',
                )}>
                  {PHASE_LABELS.fs2}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                  In-depth analysis by an assigned consultant
                </span>
                {!fs2Accessible && !fs2Active && !fs2Complete && (
                  <span className="block text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                    Commissioned after preliminary feasibility is approved
                  </span>
                )}
              </button>
            </div>

            {/* FS-2 internal tabs */}
            {fs2Active && (
              <div className={cn('ml-[14px] pl-[22px] border-l space-y-1 pt-1 pb-1', 'border-input')}>
                {FS2_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onFs2TabClick?.(tab.key)}
                    className={cn(
                      'block w-full text-left text-helper transition-colors py-1 pl-1',
                      fs2ActiveTab === tab.key
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Phase 4: FS-3 PPP Structuring ─── */}
          <div className={cn(!fs3Active && !fs3Accessible && 'opacity-40')}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => fs3Active && onPhaseClick?.('fs3')}
                  disabled={!fs3Active}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                    fs3Active && 'border-gray-600 bg-muted text-foreground cursor-pointer hover:scale-110',
                    !fs3Active && 'border-input bg-background text-muted-foreground',
                  )}
                >
                  {!fs3Accessible && !fs3Active ? <Lock className="h-3 w-3 text-gray-300" /> :
                    <span className={cn('w-2 h-2 rounded-full', fs3Active ? 'bg-gray-600' : 'bg-gray-300')} />
                  }
                </button>
              </div>
              <button
                onClick={() => fs3Active && onPhaseClick?.('fs3')}
                disabled={!fs3Active}
                className={cn(
                  'text-left transition-colors',
                  fs3Active && 'cursor-pointer hover:text-foreground',
                )}
              >
                <span className={cn(
                  'block text-body leading-snug',
                  fs3Active && 'font-semibold text-foreground',
                  !fs3Active && 'text-muted-foreground',
                )}>
                  {getFs3Label(categoryDecision)}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                  {getFs3Description(categoryDecision)}
                </span>
                {!fs3Accessible && !fs3Active && (
                  <span className="block text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                    Available after detailed feasibility is categorized
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile: horizontal bar */}
      <div className="lg:hidden mb-4">
        <div className="mb-2">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Phase-Gate Appraisal
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {/* Intake bar */}
          <div className="flex-1 min-w-0 text-center">
            <div className={cn('h-1.5 rounded-full mb-1 transition-colors', intakeComplete ? 'bg-gray-700' : intakeActive ? 'bg-muted0' : 'bg-muted')} />
            <span className={cn('text-[10px] leading-tight block truncate', intakeActive ? 'font-semibold text-foreground' : intakeComplete ? 'text-muted-foreground' : 'text-muted-foreground')}>
              Intake
            </span>
          </div>
          {/* FS-1 bar */}
          <div className="flex-1 min-w-0 text-center">
            <div className={cn('h-1.5 rounded-full mb-1 transition-colors', fs1Complete ? 'bg-gray-700' : fs1Active ? 'bg-muted0' : 'bg-muted')} />
            <span className={cn('text-[10px] leading-tight block truncate', fs1Active ? 'font-semibold text-foreground' : fs1Complete ? 'text-muted-foreground' : 'text-muted-foreground')}>
              FS-1
            </span>
          </div>
          {/* FS-2 bar */}
          <div className={cn('flex-1 min-w-0 text-center', !fs2Active && !fs2Complete && 'opacity-40')}>
            <div className={cn('h-1.5 rounded-full mb-1 transition-colors', fs2Complete ? 'bg-gray-700' : fs2Active ? 'bg-muted0' : 'bg-muted')} />
            <span className={cn('text-[10px] leading-tight block truncate', fs2Active ? 'font-semibold text-foreground' : fs2Complete ? 'text-muted-foreground' : 'text-muted-foreground')}>
              FS-2
            </span>
          </div>
          {/* FS-3 bar */}
          <div className={cn('flex-1 min-w-0 text-center', !fs3Active && 'opacity-40')}>
            <div className={cn('h-1.5 rounded-full mb-1 transition-colors', fs3Active ? 'bg-muted0' : 'bg-muted')} />
            <span className={cn('text-[10px] leading-tight block truncate', fs3Active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              FS-3
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
