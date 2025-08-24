'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';

import { Calendar, MoreVertical, Edit3, Trash2, Clock, Copy } from 'lucide-react';
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


  // Currency formatting utility
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
      {/* Action Menu - Bottom right */}
      <div className="absolute bottom-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 p-0 bg-white/90 backdrop-blur-sm shadow-sm focus:bg-blue-500 focus:text-white hover:bg-blue-50"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">

            {onEdit && (
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem 
                onClick={handleDelete} 
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* SDG Display Section - Bottom left with tooltips that can overflow */}
      {hasSDGs && (
        <div className="absolute bottom-3 left-3 z-20" style={{ zIndex: 9999 }}>
          <SDGImageGrid 
            sdgCodes={sdgGoals} 
            size="sm" 
            maxDisplay={maxSDGDisplay}
            showTooltips={true}
            className="flex-shrink-0"
          />
        </div>
      )}

      <Link href={`/activities/${activity.id}`} className="block overflow-hidden rounded-xl">
        {/* Banner Image */}
        <div className="relative">
          {activity.banner ? (
            <img
              src={activity.banner}
              alt={`Banner for ${activity.title}`}
              className="w-full h-48 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-48 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600';
                target.parentNode?.appendChild(placeholder);
              }}
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600" />
          )}
          {/* Subtle overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
          
          {/* Activity Icon Overlay - Positioned with offset from right edge and vertically centered between banner and content */}
          {(activity.icon || true) && (
            <div className="absolute right-6 bottom-0 translate-y-1/2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-white bg-white shadow-md overflow-hidden">
                {activity.icon && activity.icon.trim() !== '' ? (
                  <img
                    src={activity.icon}
                    alt={`Icon for ${activity.title}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.log("Icon failed to load for:", activity.title, "Icon data:", activity.icon?.substring(0, 100));
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // Show a fallback icon
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full bg-red-100 flex items-center justify-center';
                      fallback.innerHTML = '<span class="text-red-600 font-semibold text-sm">!</span>';
                      target.parentNode?.appendChild(fallback);
                    }}
                    onLoad={() => {
                      console.log("Icon loaded successfully for:", activity.title);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">A</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 pb-16">
          <div className="space-y-4">
            {/* Title and IDs Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground leading-tight line-clamp-2 pt-8">
                {activity.title}
                {activity.acronym && (
                  <span>
                    {' '}({activity.acronym})
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(activity.acronym!);
                      }}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                      title="Copy Acronym"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </h3>
              
              {/* Activity ID and IATI ID - Always displayed */}
              <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                <span>{activity.partner_id || 'Activity ID not reported'}</span>
                {activity.partner_id && (
                  <button
                    onClick={(e) => handleCopy(activity.partner_id!, e)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                    title="Copy Activity ID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                <span className="text-slate-400 ml-2">{activity.iati_id || 'IATI Identifier not reported'}</span>
                {activity.iati_id && (
                  <button
                    onClick={(e) => handleCopy(activity.iati_id!, e)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                    title="Copy IATI Identifier"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
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
                <StatusIcon 
                  type="publication" 
                  status={activity.publication_status} 
                  className="ml-1"
                />
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
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700">Total Budgeted</div>
                <div className="text-sm text-gray-900">{formatCurrency(activity.totalBudget || 0)}</div>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-700">Total Disbursed</div>
                <div className="text-sm text-gray-900">{formatCurrency(activity.totalDisbursed || 0)}</div>
              </div>
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
                  {activity.default_tied_status ? (TIED_STATUS_LABELS[activity.default_tied_status] || activity.default_tied_status) : 'Not reported'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Default Modality</span>
                <span className="text-sm text-gray-900">
                  {activity.default_aid_modality ? (MODALITY_LABELS[activity.default_aid_modality] || activity.default_aid_modality) : 'Not reported'}
                </span>
              </div>
            </div>

            {/* Dates Section - At bottom of card */}
            <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
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
              
              {activity.updated_at && (
                <div className="flex items-center gap-1 text-xs leading-normal text-gray-400">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    Updated {formatRelativeTime(activity.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>


    </div>
  );
};

export default ActivityCardWithSDG;