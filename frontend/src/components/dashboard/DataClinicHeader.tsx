"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { convertToCSV, downloadCSV, formatDateForCSV, CSVColumn } from '@/lib/csv-utils';

interface DataClinicHeaderProps {
  organizationId: string;
}

interface FocalPoint {
  id: string;
  name: string;
  email: string;
}

interface ActivityWithFocalPoints {
  id: string;
  title: string;
  iatiIdentifier?: string;
  governmentFocalPoints: FocalPoint[];
  developmentPartnerFocalPoints: FocalPoint[];
}

interface ActivityIssue {
  id: string;
  iatiIdentifier: string;
  title: string;
  missingGovernmentFP: boolean;
  missingDevelopmentPartnerFP: boolean;
  governmentFocalPoints: string;
  developmentPartnerFocalPoints: string;
  missingIcon: boolean;
  missingBanner: boolean;
  activityStatus: string;
  publicationStatus: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
}

export function DataClinicHeader({ organizationId }: DataClinicHeaderProps) {
  const [downloading, setDownloading] = useState(false);

  const handleBulkDownload = async () => {
    try {
      setDownloading(true);

      // Fetch focal points data
      const focalPointsResponse = await fetch(
        `/api/data-clinic/focal-points?organization_id=${organizationId}`
      );
      const focalPointsData = await focalPointsResponse.json();
      const focalPointActivities: ActivityWithFocalPoints[] = focalPointsData.activities || [];

      // Fetch all activities for image check
      const activitiesResponse = await fetch(
        `/api/activities?organization_id=${organizationId}`
      );
      const activitiesData = await activitiesResponse.json();
      const allActivities = Array.isArray(activitiesData) 
        ? activitiesData 
        : (activitiesData.activities || []);

      // Create a map of focal point issues by activity ID
      const focalPointMap = new Map<string, ActivityWithFocalPoints>(
        focalPointActivities.map((a) => [a.id, a])
      );

      // Combine all activities with issues
      const activitiesWithIssues: ActivityIssue[] = [];
      const seenIds = new Set<string>();

      // Add activities with focal point issues
      focalPointActivities.forEach((activity) => {
        seenIds.add(activity.id);
        const fullActivity = allActivities.find((a: any) => a.id === activity.id);
        
        activitiesWithIssues.push({
          id: activity.id,
          iatiIdentifier: activity.iatiIdentifier || '',
          title: activity.title,
          missingGovernmentFP: activity.governmentFocalPoints.length === 0,
          missingDevelopmentPartnerFP: activity.developmentPartnerFocalPoints.length === 0,
          governmentFocalPoints: activity.governmentFocalPoints
            .map((fp) => `${fp.name} (${fp.email})`)
            .join('; '),
          developmentPartnerFocalPoints: activity.developmentPartnerFocalPoints
            .map((fp) => `${fp.name} (${fp.email})`)
            .join('; '),
          missingIcon: !fullActivity?.icon,
          missingBanner: !fullActivity?.banner,
          activityStatus: fullActivity?.activity_status || '',
          publicationStatus: fullActivity?.publication_status || '',
          plannedStartDate: formatDateForCSV(fullActivity?.planned_start_date),
          plannedEndDate: formatDateForCSV(fullActivity?.planned_end_date),
          actualStartDate: formatDateForCSV(fullActivity?.actual_start_date),
          actualEndDate: formatDateForCSV(fullActivity?.actual_end_date),
        });
      });

      // Add activities with image issues that weren't already added
      allActivities
        .filter((a: any) => (!a.icon || !a.banner) && !seenIds.has(a.id))
        .forEach((activity: any) => {
          activitiesWithIssues.push({
            id: activity.id,
            iatiIdentifier: activity.iati_identifier || '',
            title: activity.title_narrative || activity.title || 'Untitled',
            missingGovernmentFP: false,
            missingDevelopmentPartnerFP: false,
            governmentFocalPoints: '',
            developmentPartnerFocalPoints: '',
            missingIcon: !activity.icon,
            missingBanner: !activity.banner,
            activityStatus: activity.activity_status || '',
            publicationStatus: activity.publication_status || '',
            plannedStartDate: formatDateForCSV(activity.planned_start_date),
            plannedEndDate: formatDateForCSV(activity.planned_end_date),
            actualStartDate: formatDateForCSV(activity.actual_start_date),
            actualEndDate: formatDateForCSV(activity.actual_end_date),
          });
        });

      if (activitiesWithIssues.length === 0) {
        toast.info('No activities with data issues found');
        return;
      }

      const columns: CSVColumn<ActivityIssue>[] = [
        { header: 'Activity ID', accessor: 'id' },
        { header: 'IATI Identifier', accessor: 'iatiIdentifier' },
        { header: 'Activity Title', accessor: 'title' },
        { header: 'Activity Status', accessor: 'activityStatus' },
        { header: 'Publication Status', accessor: 'publicationStatus' },
        { header: 'Missing Government FP', accessor: 'missingGovernmentFP' },
        { header: 'Missing Dev Partner FP', accessor: 'missingDevelopmentPartnerFP' },
        { header: 'Government Focal Points', accessor: 'governmentFocalPoints' },
        { header: 'Dev Partner Focal Points', accessor: 'developmentPartnerFocalPoints' },
        { header: 'Missing Logo', accessor: 'missingIcon' },
        { header: 'Missing Banner', accessor: 'missingBanner' },
        { header: 'Planned Start Date', accessor: 'plannedStartDate' },
        { header: 'Planned End Date', accessor: 'plannedEndDate' },
        { header: 'Actual Start Date', accessor: 'actualStartDate' },
        { header: 'Actual End Date', accessor: 'actualEndDate' },
      ];

      const csv = convertToCSV(activitiesWithIssues, columns);
      downloadCSV(csv, 'data_clinic_all_issues');
      toast.success(`Exported ${activitiesWithIssues.length} activities with data issues`);
    } catch (err) {
      console.error('Bulk CSV export error:', err);
      toast.error('Failed to export CSV');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Stethoscope className="h-6 w-6 text-[#7b95a7]" />
        <div>
          <h2 className="text-xl font-semibold">Data Clinic</h2>
          <p className="text-sm text-muted-foreground">
            Review and fix data quality issues in your activities
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={handleBulkDownload}
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download All Issues
      </Button>
    </div>
  );
}


