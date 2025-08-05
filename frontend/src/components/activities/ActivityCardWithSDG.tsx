'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { Calendar, MoreVertical, Edit3, Trash2, Clock, Copy, Download } from 'lucide-react';
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
import { ActivityExportModal } from './ActivityExportModal';

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
  '421': 'Reimbursable grant'
};

const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'ODA',
  '20': 'OOF',
  '30': 'Private grants',
  '35': 'Private market',
  '40': 'Non flow',
  '50': 'Other flows'
};

const TIED_STATUS_LABELS: Record<string, string> = {
  '1': 'Tied',
  '2': 'Partially tied',
  '3': 'Untied',
  '4': 'Not reported'
};

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
    // Financial and reporting fields
    created_by_org_name?: string;
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
  const [showExportModal, setShowExportModal] = useState(false);

  // Currency formatting utility
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Show enhanced export modal
  const handleExport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowExportModal(true);
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
      overflow-hidden relative group shadow-sm
      ${className}
    `}>
      {/* Action Menu - Moved to bottom right */}
      <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 p-0 bg-white/90 backdrop-blur-sm shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Image Export
            </DropdownMenuItem>
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

      <Link href={`/activities/${activity.id}`} className="block">
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
          
          {/* Activity Icon Overlay */}
          {activity.icon && (
            <div className="absolute bottom-2 right-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-white bg-white shadow-md overflow-hidden">
                <img
                  src={activity.icon}
                  alt={`Icon for ${activity.title}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Title and IDs Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold leading-tight line-clamp-2 text-gray-900 tracking-tight">
                {activity.title}
              </h3>
              
              {/* Activity ID and IATI ID with improved styling */}
              <div className="space-y-2">
                {activity.partner_id && (
                  <div className="flex items-center justify-between group/id">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activity ID</span>
                      <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">{activity.partner_id}</span>
                    </div>
                    <button
                      onClick={(e) => handleCopy(activity.partner_id, e)}
                      className="opacity-0 group-hover/id:opacity-100 transition-opacity duration-200 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                      title="Copy Activity ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {activity.iati_id && (
                  <div className="flex items-center justify-between group/iati">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">IATI ID</span>
                      <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">{activity.iati_id}</span>
                    </div>
                    <button
                      onClick={(e) => handleCopy(activity.iati_id!, e)}
                      className="opacity-0 group-hover/iati:opacity-100 transition-opacity duration-200 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                      title="Copy IATI Identifier"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Status Pills Section */}
            <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Dates Section */}
            <div className="space-y-1">
              {(activity.planned_start_date || activity.planned_end_date) && (
                <div className="flex items-center gap-1 text-xs leading-normal text-gray-500">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {formatDateRange(activity.planned_start_date, activity.planned_end_date)}
                  </span>
                  {activity.planned_start_date && activity.planned_end_date && (
                    <span className="text-gray-400 hidden sm:inline">
                      • {calculateDuration(activity.planned_start_date, activity.planned_end_date)}
                    </span>
                  )}
                </div>
              )}
              
              {activity.updated_at && (
                <div className="flex items-center gap-1 text-xs leading-normal text-gray-400">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    Updated {formatRelativeTime(activity.updated_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Financial Summary Section */}
            {(activity.totalBudget !== undefined && activity.totalBudget > 0) || (activity.totalDisbursed !== undefined && activity.totalDisbursed > 0) ? (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Financial Summary</h4>
                <div className="space-y-2">
                  {activity.totalBudget !== undefined && activity.totalBudget > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-600 uppercase tracking-wide">Total Budgeted</div>
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(activity.totalBudget)}</div>
                    </div>
                  )}
                  {activity.totalDisbursed !== undefined && activity.totalDisbursed > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-600 uppercase tracking-wide">Total Disbursed</div>
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(activity.totalDisbursed)}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Aid Modality & Reporting Section */}
            {(activity.default_aid_type || activity.default_flow_type || activity.default_tied_status || activity.created_by_org_name) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Activity Details</h4>
                <div className="space-y-2">
                  {activity.created_by_org_name && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reported by</span>
                      <span className="text-sm text-gray-700 font-medium">{activity.created_by_org_name}</span>
                    </div>
                  )}
                  {activity.default_aid_type && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aid Type</span>
                      <span className="text-sm text-gray-700">{AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type}</span>
                    </div>
                  )}
                  {activity.default_flow_type && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Flow Type</span>
                      <span className="text-sm text-gray-700">{FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type}</span>
                    </div>
                  )}
                  {activity.default_tied_status && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tied Status</span>
                      <span className="text-sm text-gray-700">{TIED_STATUS_LABELS[activity.default_tied_status] || activity.default_tied_status}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

                     {/* SDG Display Section - Bottom Left */}
         {hasSDGs && (
           <div className="flex justify-start">
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

      {/* Enhanced Export Modal */}
      <ActivityExportModal
        activity={activity}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

export default ActivityCardWithSDG;