'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MoreVertical, Edit3, Trash2, Clock } from 'lucide-react';
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
    <div className={`
      bg-white rounded-lg border border-gray-200 
      hover:border-gray-300 hover:shadow-md 
      transition-all duration-200 ease-in-out
      overflow-hidden relative group
      ${className}
    `}>
      {/* Action Menu - Better positioned */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
            <DropdownMenuContent align="end" className="w-32">
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
      )}

      <Link href={`/activities/${activity.id}`} className="block">
        {/* Banner Image - Responsive height */}
        <div className="relative">
          {activity.banner ? (
            <img
              src={activity.banner}
              alt={`Banner for ${activity.title}`}
              className="w-full h-20 sm:h-24 lg:h-28 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-20 sm:h-24 lg:h-28 bg-slate-100';
                target.parentNode?.appendChild(placeholder);
              }}
            />
          ) : (
            <div className="w-full h-20 sm:h-24 lg:h-28 bg-slate-100" />
          )}
          
          {/* Activity Icon Overlay - Better positioned */}
          {activity.icon && (
            <div className="absolute bottom-2 right-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white bg-white shadow-md overflow-hidden">
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
        
        {/* Content - Systematic spacing */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Title and IATI ID Section */}
            <div>
              <h3 className="text-base font-semibold leading-tight line-clamp-2 text-gray-900">
                {activity.title}
              </h3>
              {activity.iati_id && (
                <p className="text-xs leading-normal text-gray-500 mt-1">
                  IATI: {activity.iati_id}
                </p>
              )}
            </div>


            {/* Status Pills Section */}
            <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Dates Section - Enhanced formatting */}
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
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ActivityCard; 