'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Tag, Edit3, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ActivityCardProps {
  activity: {
    id: string;
    title: string;
    iati_id?: string;
    description?: string;
    activity_status?: string;
    publication_status?: string;
    planned_start_date?: string;
    planned_end_date?: string;
    partner_id?: string;
    banner?: string;
    icon?: string;
  };
  className?: string;
  onEdit?: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, className = '', onEdit, onDelete }) => {
  const statusColors = {
    'planned': 'bg-blue-100 text-blue-800',
    'active': 'bg-green-100 text-green-800',
    'completed': 'bg-gray-100 text-gray-800',
    'cancelled': 'bg-red-100 text-red-800'
  };

  const publicationColors = {
    'draft': 'bg-gray-100 text-gray-800',
    'published': 'bg-green-100 text-green-800',
    'pending': 'bg-yellow-100 text-yellow-800'
  };

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
    <div className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden relative ${className}`}>
      {/* Action Menu - positioned in top right */}
      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm hover:bg-white/90"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
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

      <Link href={`/activities/${activity.id}`}>
        <div className="cursor-pointer">
          {/* Banner Image */}
          <div className="relative">
            {activity.banner ? (
              <img
                src={activity.banner}
                alt={`Banner for ${activity.title}`}
                className="w-full h-24 sm:h-32 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = document.createElement('div');
                  placeholder.className = 'w-full h-24 sm:h-32 bg-slate-100';
                  target.parentNode?.appendChild(placeholder);
                }}
              />
            ) : (
              <div className="w-full h-24 sm:h-32 bg-slate-100" />
            )}
            
            {/* Activity Icon Overlay */}
            {activity.icon && (
              <div className="absolute bottom-2 right-2">
                <div className="w-12 h-12 rounded-full border-2 border-white bg-white shadow-md overflow-hidden">
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
          <div className="p-4">
            {/* Title and IATI ID */}
            <div className="mb-3 pr-8"> {/* Add right padding to avoid overlap with action menu */}
              <h3 className="font-semibold text-lg line-clamp-2 mb-1">{activity.title}</h3>
              {activity.iati_id && (
                <p className="text-xs text-gray-500">IATI: {activity.iati_id}</p>
              )}
            </div>

          {/* Description */}
          {activity.description && (
            <div 
              className="text-sm text-gray-600 line-clamp-2 mb-3 prose prose-sm max-w-none [&_h1]:text-sm [&_h1]:font-medium [&_h2]:text-sm [&_h2]:font-medium [&_h3]:text-sm [&_h3]:font-medium [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_blockquote]:my-0 [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline"
              dangerouslySetInnerHTML={{ __html: activity.description }}
            />
          )}

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {activity.activity_status && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                statusColors[activity.activity_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
              }`}>
                {activity.activity_status}
              </span>
            )}
            {activity.publication_status && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                publicationColors[activity.publication_status as keyof typeof publicationColors] || 'bg-gray-100 text-gray-800'
              }`}>
                {activity.publication_status}
              </span>
            )}
          </div>

            {/* Dates */}
            {(activity.planned_start_date || activity.planned_end_date) && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>
                  {activity.planned_start_date && new Date(activity.planned_start_date).toLocaleDateString()}
                  {activity.planned_start_date && activity.planned_end_date && ' - '}
                  {activity.planned_end_date && new Date(activity.planned_end_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ActivityCard; 