'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { Calendar, MoreVertical, Edit3, Trash2, Clock, Download } from 'lucide-react';
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
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private Development Finance',
  '35': 'Private Market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other Private Flows at Market Terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

const TIED_STATUS_LABELS: Record<string, string> = {
  '3': 'Partially tied',
  '4': 'Tied',
  '5': 'Untied'
};

interface ActivityCardProps {
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
    default_modality?: string;
    // Financial and reporting fields
    created_by_org_name?: string;
    created_by_org_acronym?: string;
    totalBudget?: number;
    totalDisbursed?: number;
  };
  className?: string;
  onEdit?: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
  isLoading?: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ 
  activity, 
  className = '', 
  onEdit, 
  onDelete,
  isLoading = false 
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

  // Export card as JPG
  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
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
  const statusColors = {
    'pipeline': 'outline',
    'planned': 'default',
    'implementation': 'success', 
    'active': 'success', 
    'completed': 'secondary',
    'cancelled': 'destructive'
  } as const;

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
      {/* Action Menu - Better positioned */}
      <div className="absolute top-3 right-3 z-10">
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
            <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Export as JPG
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
          
          {/* Activity Icon Overlay - Positioned with offset from right edge and vertically centered between banner and content */}
          {(activity.icon || true) && (
            <div className="absolute right-6 bottom-0 translate-y-1/2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white bg-white shadow-md overflow-hidden">
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
        <div className="p-6">
          <div className="space-y-4">
            {/* Title and IDs Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold leading-tight line-clamp-2 text-gray-900 tracking-tight pt-8">
                {activity.title}
              </h3>
              
              {/* Activity ID and IATI ID - Always displayed */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activity ID</span>
                  <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                    {activity.partner_id || 'Activity ID not reported'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">IATI ID</span>
                  <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                    {activity.iati_id || 'IATI Identifier not reported'}
                  </span>
                </div>
              </div>
            </div>


            {/* Status Pills Section */}
            <div className="flex flex-wrap gap-2 items-center">
              {activity.activity_status && (
                <Badge 
                  variant={statusColors[activity.activity_status as keyof typeof statusColors] || 'secondary'}
                  className="text-xs font-medium leading-tight capitalize"
                >
                  {activity.activity_status}
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
              {activity.default_modality && (
                <StatusIcon 
                  type="aid-modality" 
                  status={activity.default_modality} 
                  isPublished={activity.publication_status === 'published'}
                  className="ml-1"
                />
              )}
            </div>





            {/* Aid Modality & Reporting Section - Always displayed */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Activity Details</h4>
              <div className="space-y-2">
                {(activity.created_by_org_acronym || activity.created_by_org_name) && (
                  <div className="flex justify-between items-center py-2 min-h-[3.5rem] border-t border-gray-200">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reported by</span>
                    <span className="text-sm text-gray-700 font-medium text-right flex items-center">
                      {activity.created_by_org_acronym || activity.created_by_org_name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Budgeted</span>
                  <span className="text-sm text-gray-700">{formatCurrency(activity.totalBudget || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Disbursed</span>
                  <span className="text-sm text-gray-700">{formatCurrency(activity.totalDisbursed || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aid Type</span>
                  <span className="text-sm text-gray-700">
                    {activity.default_aid_type ? (AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type) : 'Not reported'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Flow Type</span>
                  <span className="text-sm text-gray-700">
                    {activity.default_flow_type ? (FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type) : 'Not reported'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tied Status</span>
                  <span className="text-sm text-gray-700">
                    {activity.default_tied_status ? (TIED_STATUS_LABELS[activity.default_tied_status] || activity.default_tied_status) : 'Not reported'}
                  </span>
                </div>
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

export default ActivityCard; 