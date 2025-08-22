import React from 'react';
import ActivityCard from './ActivityCard';
import ActivityCardWithSDG from './ActivityCardWithSDG';
import { ActivityCardSkeleton } from './ActivityCardSkeleton';

interface SDGMapping {
  id?: string;
  sdgGoal: number;
  sdgTarget: string;
  contributionPercent?: number;
  notes?: string;
}

interface Activity {
  id: string;
  title: string;
  iati_id?: string;
  description?: string;
  acronym?: string;
  activity_status?: string;
  publication_status?: string;
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
  totalBudget?: number;
  totalDisbursed?: number;
  sdgMappings?: SDGMapping[];
}

interface ActivityListProps {
  activities: Activity[];
  loading?: boolean;
  onEdit?: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
  skeletonCount?: number;
  className?: string;
}

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  loading = false,
  onEdit,
  onDelete,
  skeletonCount = 6,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ActivityCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500">
          <p className="text-lg font-medium mb-2">No activities found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {activities.map((activity) => (
        <ActivityCardWithSDG
          key={activity.id}
          activity={activity}
          onEdit={onEdit}
          onDelete={onDelete}
          showSDGs={true}
          maxSDGDisplay={3}
        />
      ))}
    </div>
  );
}; 