'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { Calendar, MoreVertical, Pencil, Trash2, Clock, Download, Copy, Bookmark, BookmarkCheck, Building2 } from 'lucide-react';
import { useBookmarks } from '@/hooks/use-bookmarks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatActivityDate, formatDateRange, formatRelativeTime, calculateDuration } from '@/lib/date-utils';
import { ActivityCardSkeleton } from './ActivityCardSkeleton';
import { formatReportedBy } from '@/utils/format-helpers';
import { StatusIcon } from '@/components/ui/status-icon';
import { TIED_STATUS_LABELS } from '@/types/transaction';
import { getActivityStatusDisplay } from '@/lib/activity-status-utils';
import { CardShell, CardShellLogoOverlay, CardShellRipLine } from '@/components/ui/card-shell';

// Aid modality label mappings
const AID_TYPE_LABELS: Record<string, string> = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Contributions to pooled programmes and funds',
  'B04': 'Basket funds/pooled funding',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

const FINANCE_TYPE_LABELS: Record<string, string> = {
  '110': 'Standard grant',
  '210': 'Interest subsidy',
  '310': 'Capital subscription on deposit basis',
  '311': 'Capital subscription on encashment basis',
  '410': 'Aid loan excluding debt reorganisation',
  '421': 'Standard loan',
  '422': 'Reimbursable grant'
};

const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'ODA',
  '20': 'OOF',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private Development Finance',
  '35': 'Private Market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other Private Flows at Market Terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

const MODALITY_LABELS: Record<string, string> = {
  '1': 'Grant',
  '2': 'Loan',
  '3': 'Technical Assistance',
  '4': 'Reimbursable Grant or Other',
  '5': 'Investment/Guarantee'
};

const colors = {
  paleSlate: 'hsl(var(--brand-pale-slate))',
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
  platinum: 'hsl(var(--brand-platinum))',
};

interface ActivityCardProps {
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

const submissionColors = {
  'draft': 'outline',
  'pending_validation': 'default',
  'validated': 'success',
  'rejected': 'destructive',
  'submitted': 'default'
} as const;

// Currency formatting utility with compact notation
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

const ActivityCard: React.FC<ActivityCardProps> = ({
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

  return (
    <CardShell
      href={`/activities/${activity.id}`}
      ariaLabel={`Activity: ${activity.title}`}
      className={className}
      cardRef={cardRef}
      bannerImage={activity.banner}
      bannerIcon={Building2}
      bannerActions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleBookmark(activity.id);
              }}
              className="cursor-pointer"
            >
              {isBookmarked(activity.id) ? (
                <>
                  <BookmarkCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                  Remove Bookmark
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Add Bookmark
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Export as JPG
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={handleDelete}
                className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
            <Link
              href={`/activities/${activity.id}`}
              className="relative z-10 hover:underline inline"
              onClick={(e) => e.stopPropagation()}
            >
              {activity.title}
              {activity.acronym && <span className="ml-1">({activity.acronym})</span>}
            </Link>
          </h2>
          <div className="flex items-center gap-2 text-helper" style={{ color: colors.paleSlate }}>
            {(activity.created_by_org_acronym || activity.created_by_org_name) && (
              <>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {activity.created_by_org_acronym || activity.created_by_org_name}
                </span>
                <span>•</span>
              </>
            )}
            {activity.publication_status === 'published' ? (
              <span>Published</span>
            ) : (
              <span style={{ color: colors.coolSteel }}>Unpublished</span>
            )}
          </div>
        </>
      }
    >
      {/* Icon Overlay */}
      {activity.icon && activity.icon.trim() !== '' && (
        <CardShellLogoOverlay
          src={activity.icon}
          alt={`Icon for ${activity.title}`}
        />
      )}

      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        {/* IDs */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity ID</span>
            {activity.partner_id ? (
              <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {activity.partner_id}
              </span>
            ) : (
              <span className="text-helper text-muted-foreground">Not reported</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IATI ID</span>
            {activity.iati_id ? (
              <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {activity.iati_id}
              </span>
            ) : (
              <span className="text-helper text-muted-foreground">Not reported</span>
            )}
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 items-center mb-3">
          {activity.activity_status && (() => {
            const { label, className: statusCls } = getActivityStatusDisplay(activity.activity_status);
            return (
              <Badge className={`text-helper font-medium leading-tight ${statusCls}`}>
                {label}
              </Badge>
            );
          })()}
          {activity.is_pooled_fund && (
            <Badge className="text-xs font-medium leading-tight bg-[#3C6255] text-white">
              Fund
            </Badge>
          )}
          {activity.submission_status && (
            <Badge
              variant={submissionColors[activity.submission_status as keyof typeof submissionColors] || 'secondary'}
              className="text-helper font-medium leading-tight"
            >
              {activity.submission_status === 'pending_validation' ? 'Pending Validation' :
               activity.submission_status === 'validated' ? 'Validated' :
               activity.submission_status.charAt(0).toUpperCase() + activity.submission_status.slice(1)}
            </Badge>
          )}
          {activity.publication_status && (
            <Badge
              variant={activity.publication_status === 'published' ? 'success' : 'secondary'}
              className="text-helper font-medium leading-tight"
            >
              {activity.publication_status === 'published' ? 'Published' : 'Unpublished'}
            </Badge>
          )}
          {activity.default_aid_modality && (
            <StatusIcon
              type="aid-modality"
              status={activity.default_aid_modality}
              isPublished={activity.publication_status === 'published'}
              className="ml-1"
            />
          )}
        </div>

        {/* Activity Details */}
        <div className="bg-muted/50 rounded-lg p-4 mb-3">
          <h4 className="text-body font-medium text-foreground mb-3">Activity Details</h4>
          <div className="space-y-2">
            {(activity.created_by_org_acronym || activity.created_by_org_name) && (
              <div className="flex justify-between items-center py-2 min-h-[3.5rem] border-t border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reported by</span>
                <span className="text-body text-foreground font-medium text-right">
                  {activity.created_by_org_name}
                  {activity.created_by_org_acronym && activity.created_by_org_name !== activity.created_by_org_acronym && (
                    <span> ({activity.created_by_org_acronym})</span>
                  )}
                  {!activity.created_by_org_name && activity.created_by_org_acronym && (
                    <span>{activity.created_by_org_acronym}</span>
                  )}
                </span>
              </div>
            )}
            {activity.publication_status === 'published' && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Budgeted</span>
                  <span className="text-body text-foreground">{formatCurrency(activity.totalBudget || 0)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Disbursed</span>
                  <span className="text-body text-foreground">{formatCurrency(activity.totalDisbursed || 0)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Aid Type</span>
              <span className="text-body text-foreground">
                {activity.default_aid_type ? (AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type) : 'Not reported'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Finance Type</span>
              <span className="text-body text-foreground">
                {activity.default_finance_type ? (FINANCE_TYPE_LABELS[activity.default_finance_type] || activity.default_finance_type) : 'Not reported'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Flow Type</span>
              <span className="text-body text-foreground">
                {activity.default_flow_type ? (FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type) : 'Not reported'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Tied Status</span>
              <span className="text-body text-foreground">
                {activity.default_tied_status ? (TIED_STATUS_LABELS[activity.default_tied_status as keyof typeof TIED_STATUS_LABELS] || activity.default_tied_status) : 'Not reported'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Modality</span>
              <span className="text-body text-foreground">
                {activity.default_aid_modality ? (MODALITY_LABELS[activity.default_aid_modality] || activity.default_aid_modality) : 'Not reported'}
              </span>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-1 text-helper text-muted-foreground mb-2">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {activity.planned_start_date || activity.planned_end_date ? (
              <>
                {formatDateRange(activity.planned_start_date, activity.planned_end_date)}
                {activity.planned_start_date && activity.planned_end_date && (
                  <span className="hidden sm:inline">
                    {' '}• {calculateDuration(activity.planned_start_date, activity.planned_end_date)}
                  </span>
                )}
              </>
            ) : (
              <span>Start date not reported • End date not reported</span>
            )}
          </span>
        </div>

        {/* Last Updated */}
        {activity.updated_at && (
          <div className="flex items-center gap-1 text-helper text-muted-foreground">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>Updated {formatRelativeTime(activity.updated_at)}</span>
          </div>
        )}
      </div>
    </CardShell>
  );
};

export default ActivityCard;
