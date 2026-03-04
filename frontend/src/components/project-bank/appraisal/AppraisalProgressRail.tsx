"use client"

import { Check, Lock, Clock, ChevronRight, RotateCcw, XCircle, ShieldCheck } from 'lucide-react';
import type { AppraisalStage, ProjectStage, ProjectPhase, FS1Tab } from '@/types/project-bank';
import { PHASE_LABELS, FS1_TAB_LABELS, getPhase, getGateStatus } from '@/lib/project-bank-utils';
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

interface GateIndicatorProps {
  status: GateStatus;
}

function GateIndicator({ status }: GateIndicatorProps) {
  const configs: Record<GateStatus, { icon: typeof Clock; label: string; textClass: string; bgClass: string }> = {
    locked: { icon: Lock, label: 'Requires review board approval', textClass: 'text-gray-400', bgClass: 'bg-gray-100' },
    awaiting_review: { icon: Clock, label: 'Awaiting Review', textClass: 'text-gray-700', bgClass: 'bg-gray-200' },
    approved: { icon: ShieldCheck, label: 'Approved', textClass: 'text-green-600', bgClass: 'bg-green-50' },
    returned: { icon: RotateCcw, label: 'Returned', textClass: 'text-amber-600', bgClass: 'bg-amber-50' },
    rejected: { icon: XCircle, label: 'Rejected', textClass: 'text-red-600', bgClass: 'bg-red-50' },
  };
  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className="ml-[14px] my-4 flex items-center gap-2">
      <div className="w-0.5 h-5 bg-gray-200" />
      <div className={cn('flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full', config.bgClass, config.textClass)}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
    </div>
  );
}

interface AppraisalProgressRailProps {
  projectName?: string;
  visibleStages: AppraisalStage[];
  currentStage: AppraisalStage;
  projectStage: ProjectStage;
  currentPhase: ProjectPhase;
  fs1ActiveTab: FS1Tab;
  onStageClick: (stage: AppraisalStage) => void;
  onFs1TabClick: (tab: FS1Tab) => void;
  canGoToStage: (stage: AppraisalStage) => boolean;
  isStageComplete: (stage: AppraisalStage) => boolean;
  onReturnToCurrentPhase?: () => void;
}

export function AppraisalProgressRail({
  projectName,
  visibleStages,
  currentStage,
  projectStage,
  currentPhase,
  fs1ActiveTab,
  onStageClick,
  onFs1TabClick,
  canGoToStage,
  isStageComplete,
  onReturnToCurrentPhase,
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

  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden lg:block w-[240px] shrink-0">
        <div className="sticky top-24 space-y-3">
          {/* Project name + Phase header */}
          {projectName && (
            <div className="mb-4 pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground truncate" title={projectName}>
                {projectName}
              </h3>
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
                    intakeActive && !intakeComplete && 'border-gray-600 bg-gray-100 text-gray-800',
                    !intakeComplete && !intakeActive && 'border-gray-300 bg-background text-gray-400',
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
                  'block text-sm leading-snug',
                  intakeActive && 'font-semibold text-foreground',
                  intakeComplete && !intakeActive && 'text-gray-600',
                  !intakeComplete && !intakeActive && 'text-gray-400',
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
              <div className={cn('ml-[14px] pl-[22px] border-l space-y-1 pt-1 pb-1', intakeComplete ? 'border-gray-600' : 'border-gray-300')}>
                {INTAKE_SUB_ITEMS.map((sub) => (
                  <button
                    key={sub.anchor}
                    type="button"
                    onClick={() => handleSubItemClick(sub.anchor)}
                    className="block w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors py-1 pl-1"
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
                  onClick={() => fs1Active && onReturnToCurrentPhase?.()}
                  disabled={!fs1Active && !fs1Complete}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                    fs1Complete && 'bg-gray-800 border-gray-800 text-white',
                    fs1Active && !fs1Complete && 'border-gray-600 bg-gray-100 text-gray-800',
                    !fs1Complete && !fs1Active && 'border-gray-300 bg-background text-gray-400',
                    !fs1Accessible && !fs1Active && !fs1Complete && 'opacity-40',
                    fs1Active && 'cursor-pointer hover:scale-110',
                  )}
                >
                  {fs1Complete ? <Check className="h-3.5 w-3.5" /> :
                    !fs1Accessible && !fs1Active ? <Lock className="h-3 w-3 text-gray-300" /> :
                    <span className={cn('w-2 h-2 rounded-full', fs1Active ? 'bg-gray-600' : 'bg-gray-300')} />
                  }
                </button>
              </div>
              <button
                onClick={() => fs1Active && onReturnToCurrentPhase?.()}
                disabled={!fs1Active && !fs1Complete}
                className={cn(
                  'text-left transition-colors',
                  !fs1Accessible && !fs1Active && !fs1Complete && 'opacity-40',
                  fs1Active && 'cursor-pointer hover:text-foreground',
                )}
              >
                <span className={cn(
                  'block text-sm leading-snug',
                  fs1Active && 'font-semibold text-foreground',
                  fs1Complete && !fs1Active && 'text-gray-600',
                  !fs1Complete && !fs1Active && 'text-gray-400',
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
              <div className={cn('ml-[14px] pl-[22px] border-l space-y-1 pt-1 pb-1', 'border-gray-300')}>
                {FS1_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onFs1TabClick(tab.key)}
                    className={cn(
                      'block w-full text-left text-xs transition-colors py-1 pl-1',
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

          {/* ─── Future phases — dimmed, non-interactive ─── */}
          <div className="mt-6 pt-5 space-y-6 opacity-40">
            {/* Detailed Feasibility Study */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-gray-300 bg-background shrink-0">
                <Lock className="h-3 w-3 text-gray-300" />
              </div>
              <div>
                <span className="block text-sm text-gray-400">
                  {PHASE_LABELS.fs2}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                  In-depth analysis by an assigned consultant
                </span>
                <span className="block text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                  Commissioned after preliminary feasibility is approved
                </span>
              </div>
            </div>

            {/* PPP Transaction Structuring */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-gray-300 bg-background shrink-0">
                <Lock className="h-3 w-3 text-gray-300" />
              </div>
              <div>
                <span className="block text-sm text-gray-400">
                  {PHASE_LABELS.fs3}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Contract design, risk allocation, and VGF assessment
                </span>
                <span className="block text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                  Available for PPP-routed projects after detailed feasibility
                </span>
              </div>
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
            <div className={cn('h-1.5 rounded-full mb-1 transition-colors', intakeComplete ? 'bg-gray-700' : intakeActive ? 'bg-gray-500' : 'bg-gray-200')} />
            <span className={cn('text-[10px] leading-tight block truncate', intakeActive ? 'font-semibold text-foreground' : intakeComplete ? 'text-gray-600' : 'text-gray-400')}>
              Intake
            </span>
          </div>
          {/* FS-1 bar */}
          <div className="flex-1 min-w-0 text-center">
            <div className={cn('h-1.5 rounded-full mb-1 transition-colors', fs1Complete ? 'bg-gray-700' : fs1Active ? 'bg-gray-500' : 'bg-gray-200')} />
            <span className={cn('text-[10px] leading-tight block truncate', fs1Active ? 'font-semibold text-foreground' : fs1Complete ? 'text-gray-600' : 'text-gray-400')}>
              FS-1
            </span>
          </div>
          {/* FS-2 bar */}
          <div className="flex-1 min-w-0 text-center opacity-40">
            <div className="h-1.5 rounded-full mb-1 bg-gray-200" />
            <span className="text-[10px] leading-tight block truncate text-gray-400">FS-2</span>
          </div>
          {/* FS-3 bar */}
          <div className="flex-1 min-w-0 text-center opacity-40">
            <div className="h-1.5 rounded-full mb-1 bg-gray-200" />
            <span className="text-[10px] leading-tight block truncate text-gray-400">FS-3</span>
          </div>
        </div>
      </div>
    </>
  );
}
