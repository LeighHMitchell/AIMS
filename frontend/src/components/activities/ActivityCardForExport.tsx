'use client';

import React, { useRef, forwardRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
import { SDGImageGrid } from '@/components/ui/SDGImageGrid';

interface ActivityCardForExportProps {
  activity: any;
  className?: string;
}

const ActivityCardForExport = forwardRef<HTMLDivElement, ActivityCardForExportProps>(
  ({ activity, className = '' }, ref) => {
    
    // Currency formatting utility
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    // Date formatting utilities
    const formatDateRange = (startDate?: string, endDate?: string) => {
      if (!startDate && !endDate) return '';
      if (!startDate) return `Until ${new Date(endDate!).toLocaleDateString()}`;
      if (!endDate) return `From ${new Date(startDate).toLocaleDateString()}`;
      
      const start = new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const end = new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${start} – ${end}`;
    };

    const calculateDuration = (startDate: string, endDate: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffInYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      if (diffInYears >= 1) {
        return `${Math.round(diffInYears)} year${Math.round(diffInYears) !== 1 ? 's' : ''}`;
      } else {
        const diffInMonths = diffInYears * 12;
        return `${Math.round(diffInMonths)} month${Math.round(diffInMonths) !== 1 ? 's' : ''}`;
      }
    };

    const formatRelativeTime = (dateString: string) => {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    };

    // Status color mappings
    const statusColors = {
      'pipeline': 'outline',
      'planned': 'default',
      'implementation': 'success', 
      'active': 'success', 
      'completed': 'secondary',
      'cancelled': 'destructive',
      '1': 'default',
      '2': 'success',
      '3': 'secondary',
      '4': 'secondary',
      '5': 'destructive',
      '6': 'outline',
    } as const;

    const submissionColors = {
      'draft': 'outline',
      'pending_validation': 'default',
      'validated': 'success',
      'rejected': 'destructive',
      'submitted': 'default'
    } as const;

    // Helper function to get status label from code
    const getStatusLabel = (status: string) => {
      const statusMap: Record<string, string> = {
        '1': 'Pipeline / Identification',
        '2': 'Implementation',
        '3': 'Finalisation',
        '4': 'Closed',
        '5': 'Cancelled',
        '6': 'Suspended'
      };
      return statusMap[status] || status;
    };

    // Get SDG goals
    const sdgGoals = activity.sdg_goals || [];
    const hasSDGs = sdgGoals.length > 0;

    return (
      <div 
        ref={ref}
        className={`
          bg-white rounded-2xl shadow-lg border border-gray-100 
          overflow-hidden relative max-w-4xl mx-auto
          ${className}
        `}
        style={{ minHeight: '600px', width: '800px' }}
      >
        {/* Compact Header Section */}
        <div className="relative">
          {/* Banner with overlay */}
          <div className="relative h-32">
            {activity.banner ? (
              <img
                src={activity.banner}
                alt={`Banner for ${activity.title}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/10"></div>
            
            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h1 className="text-xl font-bold text-white leading-tight line-clamp-2 mb-1">
                {activity.title}
              </h1>
              
              {/* Status Pills on banner */}
              <div className="flex flex-wrap gap-1">
                {activity.activity_status && (
                  <Badge 
                    variant={statusColors[activity.activity_status as keyof typeof statusColors] || 'secondary'}
                    className="text-xs bg-white/90 text-gray-800 border-0"
                  >
                    {getStatusLabel(activity.activity_status)}
                  </Badge>
                )}
                {activity.submission_status && activity.submission_status !== 'draft' && (
                  <Badge 
                    variant="outline"
                    className="text-xs bg-white/90 text-gray-800 border-white/20"
                  >
                    {activity.submission_status === 'pending_validation' ? 'Pending Validation' :
                     activity.submission_status === 'validated' ? 'Validated' :
                     activity.submission_status.charAt(0).toUpperCase() + activity.submission_status.slice(1)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Activity Icon */}
            {activity.icon && (
              <div className="absolute top-3 right-3">
                <div className="w-12 h-12 rounded-xl border-2 border-white bg-white shadow-lg overflow-hidden">
                  <img
                    src={activity.icon}
                    alt={`Icon for ${activity.title}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="p-6 space-y-4">
          
          {/* IDs Section - Compact */}
          <div className="grid grid-cols-2 gap-4">
            {activity.partner_id && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activity ID</div>
                <div className="text-sm font-mono bg-gray-100 px-3 py-1.5 rounded-lg">{activity.partner_id}</div>
              </div>
            )}
            {activity.iati_id && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">IATI ID</div>
                <div className="text-sm font-mono bg-gray-100 px-3 py-1.5 rounded-lg text-xs leading-tight">{activity.iati_id}</div>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          {(activity.planned_start_date || activity.planned_end_date) && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">
                  {formatDateRange(activity.planned_start_date, activity.planned_end_date)}
                </span>
                {activity.planned_start_date && activity.planned_end_date && (
                  <span className="text-blue-600">
                    • {calculateDuration(activity.planned_start_date, activity.planned_end_date)}
                  </span>
                )}
              </div>
              {activity.updated_at && (
                <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>Updated {formatRelativeTime(activity.updated_at)}</span>
                </div>
              )}
            </div>
          )}

          {/* Two Column Layout for Details */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Financial Summary - Left Column */}
            {((activity.totalBudget !== undefined && activity.totalBudget > 0) || 
              (activity.totalDisbursed !== undefined && activity.totalDisbursed > 0)) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                </div>
                
                <div className="space-y-3">
                  {activity.totalBudget !== undefined && activity.totalBudget > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Total Budgeted</div>
                      <div className="text-2xl font-bold text-green-800">{formatCurrency(activity.totalBudget)}</div>
                    </div>
                  )}
                  
                  {activity.totalDisbursed !== undefined && activity.totalDisbursed > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Total Disbursed</div>
                      <div className="text-2xl font-bold text-blue-800">{formatCurrency(activity.totalDisbursed)}</div>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  {activity.totalBudget > 0 && activity.totalDisbursed > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round((activity.totalDisbursed / activity.totalBudget) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((activity.totalDisbursed / activity.totalBudget) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Details - Right Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Activity Details</h3>
              </div>
              
              <div className="space-y-3">
                {activity.created_by_org_name && (
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reported by</div>
                    <div className="text-sm font-medium text-gray-900">{activity.created_by_org_name}</div>
                  </div>
                )}
                
                {activity.default_aid_type && (
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Aid Type</div>
                    <div className="text-sm text-gray-700">{AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type}</div>
                  </div>
                )}
                
                {activity.default_flow_type && (
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Flow Type</div>
                    <div className="text-sm text-gray-700">{FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type}</div>
                  </div>
                )}
                
                {activity.default_tied_status && (
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tied Status</div>
                    <div className="text-sm text-gray-700">{TIED_STATUS_LABELS[activity.default_tied_status] || activity.default_tied_status}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SDG Section - Full Width Bottom */}
          {hasSDGs && (
            <div className="border-t pt-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Sustainable Development Goals</h4>
                  <p className="text-xs text-gray-600">This activity contributes to {sdgGoals.length} SDG{sdgGoals.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-shrink-0">
                  <SDGImageGrid 
                    sdgCodes={sdgGoals} 
                    size="md" 
                    maxDisplay={10}
                    showTooltips={false}
                    className="gap-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Export Footer */}
          <div className="border-t pt-3 mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Exported from AIMS Platform</span>
              <span>{new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>

        </div>
      </div>
    );
  }
);

ActivityCardForExport.displayName = 'ActivityCardForExport';

export { ActivityCardForExport };