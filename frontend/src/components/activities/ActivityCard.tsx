'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Tag } from 'lucide-react';

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
  };
  className?: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, className = '' }) => {
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

  return (
    <Link href={`/activities/${activity.id}`}>
      <div className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 ${className}`}>
        {/* Title and IATI ID */}
        <div className="mb-3">
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
    </Link>
  );
};

export default ActivityCard; 