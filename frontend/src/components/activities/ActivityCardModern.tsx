'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { Calendar, MoreVertical, Edit3, Trash2, Clock, Download, Copy, Bookmark, BookmarkCheck, Building2, DollarSign } from 'lucide-react';
import { useBookmarks } from '@/hooks/use-bookmarks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatActivityDate, formatRelativeTime } from '@/lib/date-utils';
import { ActivityCardSkeleton } from './ActivityCardSkeleton';

// Color palette
const colors = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
};

interface ActivityCardModernProps {
  activity: {
    id: string;
    title: string;
    iati_id?: string;
    description?: string;
    acronym?: string;
    activity_status?: string;
    publication_status?: string;
    submission_status?: string;
    planned_start_date?: string;
    planned_end_date?: string;
    updated_at?: string;
    partner_id?: string;
    banner?: string;
    icon?: string;
    default_aid_type?: string;
    default_finance_type?: string;
    default_flow_type?: string;
    default_tied_status?: string;
    default_aid_modality?: string;
    default_aid_modality_override?: boolean;
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

// Currency formatting utility
const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}m`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
};

const ActivityCardModern: React.FC<ActivityCardModernProps> = ({
  activity,
  className = '',
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  // Export card as JPG
  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: colors.platinum,
        scale: 2,
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

  // Display ID - prefer IATI ID, fallback to partner_id
  const displayId = activity.iati_id || activity.partner_id || activity.id.slice(0, 12);
  const idLabel = activity.iati_id ? 'IATI ID' : 'Activity ID';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
      whileHover={{ y: -8 }}
      className={`group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 isolate overflow-hidden border ${className}`}
      style={{ backgroundColor: 'white' }}
      role="article"
      aria-label={`Activity: ${activity.title}`}
    >
      {/* Banner/Poster Section */}
      <div className="relative h-48 w-full overflow-hidden" style={{ backgroundColor: colors.blueSlate }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        {activity.banner ? (
          <motion.img
            src={activity.banner}
            alt={`Banner for ${activity.title}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Building2 className="h-16 w-16" style={{ color: colors.coolSteel, opacity: 0.3 }} />
          </div>
        )}

        {/* Action Menu - Top Left */}
        <div className="absolute top-4 left-4 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 backdrop-blur-sm rounded-full border-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleBookmark(activity.id);
                }}
                className="cursor-pointer"
              >
                {isBookmarked(activity.id) ? (
                  <>
                    <BookmarkCheck className="mr-2 h-4 w-4" style={{ color: colors.blueSlate }} />
                    Remove Bookmark
                  </>
                ) : (
                  <>
                    <Bookmark className="mr-2 h-4 w-4" style={{ color: colors.blueSlate }} />
                    Add Bookmark
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" style={{ color: colors.blueSlate }} />
                Export as JPG
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                  <Edit3 className="mr-2 h-4 w-4" style={{ color: colors.blueSlate }} />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer"
                  style={{ color: colors.primaryScarlet }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title & Metadata - Bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href={`/activities/${activity.id}`} className="block">
              <h2 className="text-lg font-bold text-white mb-1 line-clamp-2 transition-colors">
                {activity.title}
                {activity.acronym && (
                  <span className="font-medium ml-1" style={{ color: colors.paleSlate }}>({activity.acronym})</span>
                )}
              </h2>
            </Link>
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.paleSlate }}>
              {activity.created_by_org_acronym || activity.created_by_org_name ? (
                <>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {activity.created_by_org_acronym || activity.created_by_org_name}
                  </span>
                  <span>•</span>
                </>
              ) : null}
              {activity.publication_status === 'published' ? (
                <span style={{ color: colors.paleSlate }}>Published</span>
              ) : (
                <span style={{ color: colors.coolSteel }}>Unpublished</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Activity Icon Overlay - positioned outside banner to avoid overflow clipping */}
      {activity.icon && activity.icon.trim() !== '' && (
        <div className="absolute right-4 top-48 -translate-y-[75%] z-30">
          <div className="w-14 h-14 rounded-full border-4 shadow-lg overflow-hidden" style={{ borderColor: colors.platinum, backgroundColor: 'white' }}>
            <img
              src={activity.icon}
              alt={`Icon for ${activity.title}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Ticket Details Section */}
      <Link href={`/activities/${activity.id}`} className="block flex-1">
        <div className="relative flex-1 p-5 flex flex-col" style={{ backgroundColor: 'white' }}>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 mt-2">
              {/* Start Date */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                  Start Date
                </p>
                <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
                  <Calendar className="w-4 h-4" style={{ color: colors.coolSteel }} />
                  <span>{activity.planned_start_date ? formatActivityDate(activity.planned_start_date) : 'Not set'}</span>
                </div>
              </div>
              {/* End Date */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                  End Date
                </p>
                <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
                  <Calendar className="w-4 h-4" style={{ color: colors.coolSteel }} />
                  <span>{activity.planned_end_date ? formatActivityDate(activity.planned_end_date) : 'Not set'}</span>
                </div>
              </div>
              {/* Budget */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                  Total Budget
                </p>
                <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
                  <DollarSign className="w-4 h-4" style={{ color: colors.coolSteel }} />
                  <span>{formatCurrency(activity.totalBudget || 0)}</span>
                </div>
              </div>
              {/* Disbursed */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                  Disbursed
                </p>
                <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
                  <DollarSign className="w-4 h-4" style={{ color: colors.coolSteel }} />
                  <span>{formatCurrency(activity.totalDisbursed || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rip Line */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute -left-5 h-10 w-10 rounded-full z-20" style={{ backgroundColor: 'white' }} />
            <div className="w-full border-t-2 border-dashed" style={{ borderColor: colors.paleSlate }} />
            <div className="absolute -right-5 h-10 w-10 rounded-full z-20" style={{ backgroundColor: 'white' }} />
          </div>

          {/* Bottom Section */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                {idLabel}
              </p>
              <p className="flex items-center gap-1">
                <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{displayId}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.writeText(displayId);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy ID"
                >
                  <Copy className="w-3 h-3" style={{ color: colors.coolSteel }} />
                </button>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {activity.updated_at && (
                <div className="flex items-center gap-1 text-[10px]" style={{ color: colors.coolSteel }}>
                  <Clock className="w-3 h-3" />
                  <span>Updated {formatRelativeTime(activity.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ActivityCardModern;
