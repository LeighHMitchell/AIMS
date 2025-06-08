"use client"

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutGrid,
  Workflow,
  Eye
} from "lucide-react";

interface Activity {
  id: string;
  title: string;
  activityStatus?: string;
  publicationStatus?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivitySummaryCardsProps {
  allActivities: Activity[];
  filteredActivities: Activity[];
  currentPageActivities: Activity[];
  hasFiltersApplied: boolean;
}

const ActivitySummaryCards: React.FC<ActivitySummaryCardsProps> = ({
  allActivities,
  filteredActivities,
  currentPageActivities,
  hasFiltersApplied
}) => {
  // Calculate detailed status counts for filtered activities
  const filteredStatusCounts = useMemo(() => {
    const counts = {
      planning: 0,
      implementation: 0,
      completed: 0,
      cancelled: 0
    };

    filteredActivities.forEach(activity => {
      const status = (activity.activityStatus || activity.status || '').toLowerCase();
      if (status.includes('planning')) counts.planning++;
      else if (status.includes('implementation')) counts.implementation++;
      else if (status.includes('completed')) counts.completed++;
      else if (status.includes('cancelled')) counts.cancelled++;
    });

    return counts;
  }, [filteredActivities]);

  // Calculate publication status counts for filtered activities
  const filteredPublicationCounts = useMemo(() => {
    const counts = {
      draft: 0,
      published: 0
    };

    filteredActivities.forEach(activity => {
      const pubStatus = (activity.publicationStatus || '').toLowerCase();
      if (pubStatus === 'published') counts.published++;
      else counts.draft++;
    });

    return counts;
  }, [filteredActivities]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Card 1: Total Activities */}
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{currentPageActivities.length}</div>
          <p className="text-sm text-muted-foreground">
            Currently visible
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Activity Status */}
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activity Status</CardTitle>
          <Workflow className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-baseline">
            <div className="text-2xl font-bold">{filteredStatusCounts.planning}</div>
            <div className="text-xl font-semibold">{filteredStatusCounts.implementation}</div>
            <div className="text-lg font-semibold">{filteredStatusCounts.completed}</div>
            <div className="text-lg font-semibold">{filteredStatusCounts.cancelled}</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Planning, Implementation, Completed, Cancelled
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Publication Status */}
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Publication Status</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 items-baseline">
            <div className="text-2xl font-bold">{filteredPublicationCounts.draft}</div>
            <div className="text-2xl font-bold">{filteredPublicationCounts.published}</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Draft, Published
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivitySummaryCards; 