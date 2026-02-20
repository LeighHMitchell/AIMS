'use client';

import React, { useRef, useState, memo } from 'react';
import Link from 'next/link';

import { Calendar, MoreVertical, Pencil, Trash2, Clock, Copy, Bookmark, BookmarkCheck } from 'lucide-react';
import { useBookmarks } from '@/hooks/use-bookmarks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatActivityDate, formatDateRange, formatRelativeTime, calculateDuration } from '@/lib/date-utils';
import { ActivityCardSkeleton } from './ActivityCardSkeleton';
import { SDGImageGrid } from '@/components/ui/SDGImageGrid';
import { formatReportedBy } from '@/utils/format-helpers';
import { StatusIcon } from '@/components/ui/status-icon';
import { TIED_STATUS_LABELS } from '@/types/transaction';


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

// Tied Status mappings imported from @/types/transaction

interface SDGMapping {
  id?: string;
  sdgGoal: number;
  sdgTarget: string;
  contributionPercent?: number;
  notes?: string;
}

interface ActivityCardWithSDGProps {
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
    // Default aid modality fields
    default_aid_type?: string;
    default_finance_type?: string;
    default_flow_type?: string;
    default_tied_status?: string;
    default_aid_modality?: string;
    default_aid_modality_override?: boolean;
    // Financial and reporting fields
    created_by_org_name?: string;
    created_by_org_acronym?: string;
    totalBudget?: number;
    totalDisbursed?: number;
    // SDG mapping support
    sdgMappings?: SDGMapping[];
  };
  className?: string;
  onEdit?: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
  isLoading?: boolean;
  showSDGs?: boolean; // Option to show/hide SDG display
  maxSDGDisplay?: number; // Maximum number of SDGs to show
}

const ActivityCardWithSDG: React.FC<ActivityCardWithSDGProps> = ({ 
  activity, 
  className = '', 
  onEdit, 
  onDelete,
  isLoading = false,
  showSDGs = true,
  maxSDGDisplay = 5
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();


  // Currency formatting utility with compact notation
  const formatCurrency = (value: number) => {
    let formattedValue: string;
    if (value >= 1000000) {
      // Format millions with 1 decimal place
      const millions = value / 1000000;
      formattedValue = `${millions.toFixed(1)}m`;
    } else if (value >= 1000) {
      // Format thousands with 1 decimal place
      const thousands = value / 1000;
      formattedValue = `${thousands.toFixed(1)}k`;
    } else {
      // Format regular numbers with no decimals
      formattedValue = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return <><span className="text-muted-foreground">USD</span> {formattedValue}</>;
  };


  const statusColors = {
    'pipeline': 'outline',
    'planned': 'default',
    'implementation': 'success', 
    'active': 'success', 
    'completed': 'secondary',
    'cancelled': 'destructive',
    '1': 'default', // Pipeline / Identification
    '2': 'success', // Implementation
    '3': 'secondary', // Finalisation
    '4': 'secondary', // Closed
    '5': 'destructive', // Cancelled
    '6': 'outline', // Suspended
  } as const;

  // Helper function to get status label from code
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      '1': 'Pipeline',
      '2': 'Implementation',
      '3': 'Finalisation',
      '4': 'Closed',
      '5': 'Cancelled',
      '6': 'Suspended',
      'pipeline': 'Pipeline',
      'planned': 'Planned',
      'implementation': 'Implementation',
      'active': 'Active',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'suspended': 'Suspended',
    };
    return labels[status] || status;
  };

  const publicationColors = {
    'draft': 'secondary',
    'published': 'success',
    'pending': 'yellow'
  } as const;

  const submissionColors = {
    'draft': 'outline',
    'pending_validation': 'default',
    'validated': 'success',
    'rejected': 'destructive',
    'submitted': 'default'
  } as const;

  const modalityColors = {
    '1': 'purple',      // Grant - purple (unique color)
    '2': 'orange',      // Loan - orange (unique color)
    '3': 'teal',        // Technical Assistance - teal (unique color)
    '4': 'indigo',      // Reimbursable Grant - indigo (unique color)
    '5': 'rose'         // Investment/Guarantee - rose (unique color)
  } as const;

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

  const handleCopy = async (text: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if you have a toast system
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Extract SDG goals from mappings and filter out invalid values
  const sdgGoals = activity.sdgMappings
    ?.map(mapping => mapping.sdgGoal)
    .filter(goal => goal !== undefined && goal !== null && !isNaN(goal)) || [];
  const hasSDGs = showSDGs && sdgGoals.length > 0;

  return (
    <div 
      ref={cardRef}
      className={`
      bg-white rounded-xl border border-gray-100 
      hover:border-gray-200 hover:shadow-lg 
      transition-all duration-300 ease-in-out
      relative group shadow-sm
      ${className}
    `}>
      {/* Last Updated - Bottom left */}
      {activity.updated_at && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="flex items-center gap-1 text-xs leading-normal text-gray-400">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              Updated {formatRelativeTime(activity.updated_at)}
            </span>
          </div>
        </div>
      )}

      {/* Action Menu - Bottom right */}
      <div className="absolute bottom-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-56">
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
                  <BookmarkCheck className="mr-2 h-4 w-4 text-slate-600" />
                  Remove Bookmark
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Add Bookmark
                </>
              )}
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4 text-slate-500" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>



      <Link href={`/activities/${activity.id}`} className="block overflow-hidden rounded-xl">
        {/* Banner Image */}
        {activity.banner && (
          <div className="relative">
            <img
              src={activity.banner}
              alt={`Banner for ${activity.title}`}
              className="w-full h-48 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            
            {/* Activity Icon Overlay - Positioned with offset from right edge and vertically centered between banner and content */}
            {activity.icon && activity.icon.trim() !== '' && (
              <div className="absolute right-6 bottom-0 translate-y-1/2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-white bg-white shadow-md overflow-hidden">
                  <img
                    src={activity.icon}
                    alt={`Icon for ${activity.title}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.log("Icon failed to load for:", activity.title, "Icon data:", activity.icon?.substring(0, 100));
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log("Icon loaded successfully for:", activity.title);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {/* Activity Icon Overlay - When there's no banner, show icon below banner area */}
        {!activity.banner && activity.icon && activity.icon.trim() !== '' && (
          <div className="relative pt-6">
            <div className="flex justify-end pr-6 pb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-white bg-white shadow-md overflow-hidden">
                <img
                  src={activity.icon}
                  alt={`Icon for ${activity.title}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.log("Icon failed to load for:", activity.title, "Icon data:", activity.icon?.substring(0, 100));
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log("Icon loaded successfully for:", activity.title);
                  }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 pb-16">
          <div className="space-y-4">
            {/* Title and IDs Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground leading-tight line-clamp-2 pt-8">
                {activity.title}
                {activity.acronym && (
                  <span>
                    {' '}({activity.acronym})
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    navigator.clipboard.writeText(activity.acronym || activity.title);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                  title={activity.acronym ? "Copy Acronym" : "Copy Activity Title"}
                >
                  <Copy className="w-3 h-3" />
                </button>
              </h3>
              
              {/* Activity ID and IATI ID - Always displayed */}
              <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                {activity.partner_id ? (
                  <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{activity.partner_id}</span>
                ) : (
                  <span className="text-muted-foreground">Activity ID not reported</span>
                )}
                {activity.partner_id && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(activity.partner_id!, e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                    title="Copy Activity ID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                {activity.iati_id ? (
                  <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-2">{activity.iati_id}</span>
                ) : (
                  <span className="text-muted-foreground ml-2">IATI Identifier not reported</span>
                )}
                {activity.iati_id && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(activity.iati_id!, e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                    title="Copy IATI Identifier"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Dates Section - Under IDs */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs leading-normal text-gray-500">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {activity.planned_start_date || activity.planned_end_date ? (
                      <>
                        {formatDateRange(activity.planned_start_date, activity.planned_end_date)}
                        {activity.planned_start_date && activity.planned_end_date && (
                          <span className="text-gray-400 hidden sm:inline">
                            • {calculateDuration(activity.planned_start_date, activity.planned_end_date)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">
                        Start date not reported • End date not reported
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Pills Section */}
            <div className="flex flex-wrap gap-2 items-center">
              {activity.activity_status && (
                <Badge 
                  variant={statusColors[activity.activity_status as keyof typeof statusColors] || 'secondary'}
                  className="text-xs font-medium leading-tight"
                >
                  {getStatusLabel(activity.activity_status)}
                </Badge>
              )}
              {activity.submission_status && (
                <Badge 
                  variant={submissionColors[activity.submission_status as keyof typeof submissionColors] || 'secondary'}
                  className="text-xs font-medium leading-tight"
                >
                  {activity.submission_status === 'pending_validation' ? 'Pending Validation' :
                   activity.submission_status === 'validated' ? 'Validated' :
                   activity.submission_status.charAt(0).toUpperCase() + activity.submission_status.slice(1)}
                </Badge>
              )}
              {activity.publication_status && (
                <Badge 
                  variant={activity.publication_status === 'published' ? 'success' : 'secondary'}
                  className="text-xs font-medium leading-tight"
                >
                  {activity.publication_status === 'published' ? 'Published' : 'Unpublished'}
                </Badge>
              )}
              {activity.default_aid_modality && (
                <Badge 
                  variant={modalityColors[activity.default_aid_modality as keyof typeof modalityColors] || 'outline'}
                  className="text-xs font-medium leading-tight"
                >
                  {MODALITY_LABELS[activity.default_aid_modality] || activity.default_aid_modality}
                </Badge>
              )}
            </div>





            {/* Activity Details - Always displayed */}
            <div className="space-y-2">
              {(activity.created_by_org_acronym || activity.created_by_org_name) && (
                <div className="flex justify-between items-center py-2 min-h-[3.5rem] border-t border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Reported by</span>
                  <span className="text-sm text-gray-900 text-right">
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
                    <div className="text-sm font-medium text-gray-700">Total Budgeted</div>
                    <div className="text-sm text-gray-900">{formatCurrency(activity.totalBudget || 0)}</div>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-700">Total Disbursed</div>
                    <div className="text-sm text-gray-900">{formatCurrency(activity.totalDisbursed || 0)}</div>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Default Aid Type</span>
                <span className="text-sm text-gray-900">
                  {activity.default_aid_type ? (AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type) : 'Not reported'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Default Finance Type</span>
                <span className="text-sm text-gray-900">
                  {activity.default_finance_type ? (FINANCE_TYPE_LABELS[activity.default_finance_type] || activity.default_finance_type) : 'Not reported'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Default Flow Type</span>
                <span className="text-sm text-gray-900">
                  {activity.default_flow_type ? (FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type) : 'Not reported'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Default Tied Status</span>
                <span className="text-sm text-gray-900">
                  {activity.default_tied_status ? (TIED_STATUS_LABELS[activity.default_tied_status as keyof typeof TIED_STATUS_LABELS] || activity.default_tied_status) : 'Not reported'}
                </span>
              </div>

            </div>

            {/* SDG Display Section - Move to after Activity Details, no border */}
            {hasSDGs && (
              <div className="pt-3">
                <SDGImageGrid 
                  sdgCodes={sdgGoals} 
                  size="sm" 
                  maxDisplay={maxSDGDisplay}
                  showTooltips={true}
                  className="flex-shrink-0"
                />
              </div>
            )}
          </div>
        </div>
      </Link>


    </div>
  );
};

// Memoize component to prevent unnecessary re-renders when parent re-renders
// but activity data hasn't changed
export default memo(ActivityCardWithSDG, (prevProps, nextProps) => {
  // Only re-render if these key props change
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.title === nextProps.activity.title &&
    prevProps.activity.updated_at === nextProps.activity.updated_at &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.showSDGs === nextProps.showSDGs &&
    prevProps.maxSDGDisplay === nextProps.maxSDGDisplay
  );
});