"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ImageOff,
  ArrowRight,
  CheckCircle2,
  Image,
  Sparkles,
  Upload,
  Loader2,
  Download,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { convertToCSV, downloadCSV, CSVColumn } from '@/lib/csv-utils';

interface MissingImagesCardProps {
  organizationId: string;
  limit?: number;
}

interface ActivityWithImages {
  id: string;
  title: string;
  iatiIdentifier?: string;
  banner?: string;
  icon?: string;
}

type ImageType = 'icon' | 'banner';

export function MissingImagesCard({
  organizationId,
  limit = 10,
}: MissingImagesCardProps) {
  const router = useRouter();
  const { user } = useUser();
  const [activities, setActivities] = useState<ActivityWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState<{ activityId: string; type: ImageType } | null>(null);
  const [dragOver, setDragOver] = useState<{ activityId: string; type: ImageType } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<{ activityId: string; type: ImageType } | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      const response = await fetch(`/api/activities?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      const activitiesData = Array.isArray(data) ? data : (data.activities || []);

      const missingImages = activitiesData
        .filter((activity: any) => !activity.banner || !activity.icon)
        .map((activity: any) => ({
          id: activity.id,
          title: activity.title || activity.title_narrative || 'Untitled Activity',
          iatiIdentifier: activity.iatiIdentifier || activity.iati_identifier,
          banner: activity.banner,
          icon: activity.icon,
        }));

      setTotal(missingImages.length);
      setActivities(missingImages.slice(0, limit));
    } catch (err) {
      console.error('[MissingImagesCard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [organizationId, limit]);

  useEffect(() => {
    if (organizationId) {
      fetchActivities();
    }
  }, [organizationId, fetchActivities]);

  const handleActivityClick = (activityId: string) => {
    router.push(`/activities/${activityId}?tab=overview`);
  };

  const handleViewAll = () => {
    router.push('/activities');
  };

  const handleDownloadCSV = async () => {
    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      const response = await fetch(`/api/activities?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      const activitiesData = Array.isArray(data) ? data : (data.activities || []);

      interface MissingImageActivity {
        id: string;
        title: string;
        iatiIdentifier: string;
        hasIcon: boolean;
        hasBanner: boolean;
        activityStatus: string;
        publicationStatus: string;
      }

      const missingImages: MissingImageActivity[] = activitiesData
        .filter((activity: any) => !activity.banner || !activity.icon)
        .map((activity: any) => ({
          id: activity.id,
          title: activity.title || activity.title_narrative || 'Untitled Activity',
          iatiIdentifier: activity.iatiIdentifier || activity.iati_identifier || '',
          hasIcon: !!activity.icon,
          hasBanner: !!activity.banner,
          activityStatus: activity.activity_status || '',
          publicationStatus: activity.publication_status || '',
        }));

      if (missingImages.length === 0) {
        toast.info('No activities to export');
        return;
      }

      const columns: CSVColumn<MissingImageActivity>[] = [
        { header: 'Activity ID', accessor: 'id' },
        { header: 'IATI Identifier', accessor: 'iatiIdentifier' },
        { header: 'Activity Title', accessor: 'title' },
        { header: 'Has Logo', accessor: 'hasIcon' },
        { header: 'Has Banner', accessor: 'hasBanner' },
        { header: 'Missing Logo', accessor: (row) => !row.hasIcon },
        { header: 'Missing Banner', accessor: (row) => !row.hasBanner },
        { header: 'Activity Status', accessor: 'activityStatus' },
        { header: 'Publication Status', accessor: 'publicationStatus' },
      ];

      const csv = convertToCSV(missingImages, columns);
      downloadCSV(csv, 'activities_missing_images');
      toast.success(`Exported ${missingImages.length} activities`);
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  const handleUploadClick = (e: React.MouseEvent, activityId: string, type: ImageType) => {
    e.stopPropagation();
    setPendingUpload({ activityId, type });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload) return;

    await uploadImage(file, pendingUpload.activityId, pendingUpload.type);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPendingUpload(null);
  };

  const handleDrop = async (e: React.DragEvent, activityId: string, type: ImageType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    await uploadImage(file, activityId, type);
  };

  const handleDragOver = (e: React.DragEvent, activityId: string, type: ImageType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ activityId, type });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  };

  const uploadImage = async (file: File, activityId: string, type: ImageType) => {
    try {
      setUploading({ activityId, type });

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // Update the activity
      const response = await fetch('/api/activities/field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          field: type,
          value: base64,
          user: user ? { id: user.id } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      // Update local state
      setActivities(prev => prev.map(activity => {
        if (activity.id === activityId) {
          return {
            ...activity,
            [type]: base64,
          };
        }
        return activity;
      }));

      // If both images are now set, remove from list after a short delay
      const updatedActivity = activities.find(a => a.id === activityId);
      if (updatedActivity) {
        const willHaveBoth = type === 'icon' 
          ? (base64 && updatedActivity.banner)
          : (updatedActivity.icon && base64);
        
        if (willHaveBoth) {
          setTimeout(() => {
            setActivities(prev => prev.filter(a => a.id !== activityId));
            setTotal(prev => prev - 1);
          }, 1000);
        }
      }

    } catch (err) {
      console.error('[MissingImagesCard] Upload error:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const renderImageCell = (activity: ActivityWithImages, type: ImageType) => {
    const hasImage = type === 'icon' ? activity.icon : activity.banner;
    const isUploading = uploading?.activityId === activity.id && uploading?.type === type;
    const isDraggedOver = dragOver?.activityId === activity.id && dragOver?.type === type;
    
    const sizeClass = type === 'icon' ? 'h-10 w-10' : 'h-10 w-16';

    if (hasImage) {
      return (
        <div className="flex justify-center">
          <img
            src={hasImage}
            alt={type === 'icon' ? 'Logo' : 'Banner'}
            className={`${sizeClass} ${type === 'icon' ? 'object-contain' : 'object-cover'} rounded border border-slate-200`}
          />
        </div>
      );
    }

    return (
      <div className="flex justify-center">
        <div
          className={`${sizeClass} rounded border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
            isDraggedOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
          }`}
          onClick={(e) => handleUploadClick(e, activity.id, type)}
          onDrop={(e) => handleDrop(e, activity.id, type)}
          onDragOver={(e) => handleDragOver(e, activity.id, type)}
          onDragLeave={handleDragLeave}
          title={`Click or drag to upload ${type === 'icon' ? 'logo' : 'banner'}`}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          ) : isDraggedOver ? (
            <Upload className="h-4 w-4 text-blue-500" />
          ) : (
            <Image className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageOff className="h-5 w-5 text-red-500" />
            Activities Missing Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load activities: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state - all activities have images!
  if (activities.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Activities Missing Images
          </CardTitle>
          <CardDescription>
            Add banners and logos to make your activities stand out
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium text-slate-700">All activities have images!</p>
            <p className="text-sm text-slate-500 mt-1">
              Great job! All your activities have banners and logos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageOff className="h-5 w-5 text-[#7b95a7]" />
              Activities Missing Images
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({total} {total === 1 ? 'activity' : 'activities'})
              </span>
            </CardTitle>
            <CardDescription>
              Click or drag images onto the boxes to upload
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              title="Download as CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            {total > limit && (
              <Button variant="outline" size="sm" onClick={handleViewAll}>
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead className="w-[100px] text-center">Logo</TableHead>
              <TableHead className="w-[120px] text-center">Banner</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow
                key={activity.id}
                className="hover:bg-slate-50"
              >
                <TableCell
                  className="cursor-pointer"
                  onClick={() => handleActivityClick(activity.id)}
                >
                  <div>
                    <p className="font-medium text-slate-900 line-clamp-1">
                      {activity.title}
                    </p>
                    {activity.iatiIdentifier && (
                      <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {activity.iatiIdentifier}
                      </code>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {renderImageCell(activity, 'icon')}
                </TableCell>
                <TableCell className="text-center">
                  {renderImageCell(activity, 'banner')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivityClick(activity.id);
                    }}
                  >
                    Edit
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
