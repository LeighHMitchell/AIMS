'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { Calendar, Clock, Copy, Building2, DollarSign } from 'lucide-react';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { formatActivityDate, formatRelativeTime } from '@/lib/date-utils';
import { ActivityCardSkeleton } from './ActivityCardSkeleton';
import { ActivityCardActionMenu } from './ActivityCardActionMenu';
import { getActivityStatusLabel } from '@/lib/activity-status-utils';
import { CardShell, CardShellLogoOverlay, CardShellRipLine } from '@/components/ui/card-shell';

// Color palette — uses brand tokens from CSS variables for theme compatibility
const colors = {
  paleSlate: 'hsl(var(--brand-pale-slate))',
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
  platinum: 'hsl(var(--brand-platinum))',
};

interface ActivityCardModernProps {
  activity: {
    id: string;
    title: string;
    iati_id?: string;
    description?: string;
    acronym?: string;
    activity_status?: string;
    publication_status?: string;
    submission_status?: string;
    planned_start_date?: string;
    planned_end_date?: string;
    updated_at?: string;
    partner_id?: string;
    banner?: string;
    icon?: string;
    default_aid_type?: string;
    default_finance_type?: string;
    default_flow_type?: string;
    default_tied_status?: string;
    default_aid_modality?: string;
    default_aid_modality_override?: boolean;
    created_by_org_name?: string;
    created_by_org_acronym?: string;
    totalBudget?: number;
    totalDisbursed?: number;
    is_pooled_fund?: boolean;
  };
  className?: string;
  onEdit?: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
  isLoading?: boolean;
}

// Currency formatting utility
const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}m`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
};

const ActivityCardModern: React.FC<ActivityCardModernProps> = ({
  activity,
  className = '',
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  // Export card as JPG
  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: colors.platinum,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `activity-${activity.partner_id || activity.id}-card.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error exporting card:', error);
    }
  };

  if (isLoading) {
    return <ActivityCardSkeleton className={className} />;
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(activity.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(activity.id);
  };

  // Display ID - prefer IATI ID, fallback to partner_id
  const displayId = activity.iati_id || activity.partner_id || activity.id.slice(0, 12);
  const idLabel = activity.iati_id ? 'IATI ID' : 'Activity ID';

  return (
    <CardShell
      ariaLabel={`Activity: ${activity.title}`}
      className={className}
      cardRef={cardRef}
      bannerImage={activity.banner}
      bannerIcon={Building2}
      bannerActions={
        <ActivityCardActionMenu
          activityId={activity.id}
          isBookmarked={isBookmarked(activity.id)}
          onToggleBookmark={() => toggleBookmark(activity.id)}
          onExportJPG={() => handleExport({} as React.MouseEvent)}
          onEdit={onEdit ? () => onEdit(activity.id) : undefined}
          onDelete={onDelete ? () => onDelete(activity.id) : undefined}
        />
      }
      bannerOverlay={
        <>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
            <Link href={`/activities/${activity.id}`} className="min-w-0">
              <h2 className="text-lg font-bold text-white line-clamp-2 transition-colors">
                {activity.title}
                {activity.acronym && (
                  <span className="text-lg font-bold ml-1 text-white">({activity.acronym})</span>
                )}
              </h2>
            </Link>
            {(activity.partner_id || activity.iati_id) && (
              <div className="flex flex-wrap items-center gap-1">
                {activity.partner_id && (
                  <span className="text-xs font-mono bg-white/20 text-white px-1.5 py-0.5 rounded truncate max-w-[200px]">
                    {activity.partner_id}
                  </span>
                )}
                {activity.iati_id && (
                  <span className="text-xs font-mono bg-white/20 text-white px-1.5 py-0.5 rounded truncate max-w-[220px]">
                    {activity.iati_id}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-helper" style={{ color: colors.paleSlate }}>
            {activity.created_by_org_acronym || activity.created_by_org_name ? (
              <>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {activity.created_by_org_acronym || activity.created_by_org_name}
                </span>
                <span>•</span>
              </>
            ) : null}
            {activity.publication_status === 'published' ? (
              <span style={{ color: colors.paleSlate }}>Published</span>
            ) : (
              <span style={{ color: colors.coolSteel }}>Unpublished</span>
            )}
            {activity.is_pooled_fund && (
              <>
                <span>•</span>
                <span style={{ color: '#3C6255', fontWeight: 600 }}>Fund</span>
              </>
            )}
            {activity.activity_status && (
              <>
                <span>•</span>
                <span style={{ color: colors.paleSlate }}>
                  {getActivityStatusLabel(activity.activity_status)}
                </span>
              </>
            )}
          </div>
        </>
      }
    >
      {/* Activity Icon Overlay */}
      {activity.icon && activity.icon.trim() !== '' && (
        <CardShellLogoOverlay
          src={activity.icon}
          alt={`Icon for ${activity.title}`}
        />
      )}

      {/* Ticket Details Section */}
      <div className="relative flex-1 p-5 flex flex-col select-text cursor-default bg-card">
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Start Date
              </p>
              <div className="flex items-center gap-2 font-medium text-body" style={{ color: colors.blueSlate }}>
                <Calendar className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{activity.planned_start_date ? formatActivityDate(activity.planned_start_date) : 'Not set'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                End Date
              </p>
              <div className="flex items-center gap-2 font-medium text-body" style={{ color: colors.blueSlate }}>
                <Calendar className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{activity.planned_end_date ? formatActivityDate(activity.planned_end_date) : 'Not set'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Total Budget
              </p>
              <div className="flex items-center gap-2 font-medium text-body" style={{ color: colors.blueSlate }}>
                <DollarSign className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{formatCurrency(activity.totalBudget || 0)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Disbursed
              </p>
              <div className="flex items-center gap-2 font-medium text-body" style={{ color: colors.blueSlate }}>
                <DollarSign className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{formatCurrency(activity.totalDisbursed || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rip Line */}
        <div className="my-4">
          <CardShellRipLine />
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
              {idLabel}
            </p>
            <p className="text-helper leading-relaxed">
              <span className="font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded-sm" style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{displayId}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigator.clipboard.writeText(displayId);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity inline-block ml-1 align-middle"
                title="Copy ID"
              >
                <Copy className="w-3 h-3" style={{ color: colors.coolSteel }} />
              </button>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {activity.updated_at && (
              <div className="flex items-center gap-1 text-[10px]" style={{ color: colors.coolSteel }}>
                <Clock className="w-3 h-3" />
                <span>Updated {formatRelativeTime(activity.updated_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </CardShell>
  );
};

export default ActivityCardModern;
