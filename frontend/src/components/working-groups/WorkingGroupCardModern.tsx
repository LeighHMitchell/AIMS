'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Calendar, FileText, MoreVertical, Pencil, Eye, Trash2, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardShell } from '@/components/ui/card-shell';

// Brand palette from CSS variables
const colors = {
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
  paleSlate: 'hsl(var(--brand-pale-slate))',
};

interface WorkingGroupCardProps {
  workingGroup: {
    id: string;
    code?: string;
    label?: string;
    description?: string;
    sector_code?: string;
    is_active?: boolean;
    status?: string;
    banner?: string;
    icon_url?: string;
    group_type?: string;
    member_count?: number;
    members?: any[];
    meetings?: any[];
    activities?: any[];
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const BANNER_COUNT = 8;
function getDefaultBanner(id: string): string {
  // Simple hash of the ID to pick a consistent but varied banner
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const index = (Math.abs(hash) % BANNER_COUNT) + 1;
  return `/images/working-groups/banner-${index}.svg`;
}

const WorkingGroupCardModern: React.FC<WorkingGroupCardProps> = ({
  workingGroup,
  onEdit,
  onDelete,
  className = '',
}) => {
  const wgUrl = `/working-groups/${workingGroup.id}`;
  const defaultBanner = getDefaultBanner(workingGroup.id);

  return (
    <CardShell
      href={wgUrl}
      ariaLabel={`Working Group: ${workingGroup.label}`}
      className={className}
      bannerImage={workingGroup.banner || defaultBanner}
      bannerIcon={Users}
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
            <Link
              href={wgUrl}
              className="relative z-10 inline"
              onClick={(e) => e.stopPropagation()}
            >
              {workingGroup.label || 'Unnamed Group'}
            </Link>{' '}
            {workingGroup.code && (
              <span className="text-xs font-mono font-normal bg-white/20 text-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap align-middle">
                {workingGroup.code}
              </span>
            )}
          </h2>
        </>
      }
    >
      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <div className="flex items-center justify-between mb-3">
          <Badge variant={workingGroup.is_active ? 'success' : 'secondary'}>
            {workingGroup.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {workingGroup.description && (
          <p className="text-sm line-clamp-3 mb-4 text-muted-foreground">
            {workingGroup.description}
          </p>
        )}

        <div className="flex items-end justify-between mt-auto">
          <div className="grid grid-cols-3 gap-3 flex-1">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</p>
              <div className="flex items-center gap-1.5 font-medium text-sm" style={{ color: colors.blueSlate }}>
                <Users className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{workingGroup.member_count ?? workingGroup.members?.length ?? 0}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Meetings</p>
              <div className="flex items-center gap-1.5 font-medium text-sm" style={{ color: colors.blueSlate }}>
                <Calendar className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{workingGroup.meetings?.length || 0}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activities</p>
              <div className="flex items-center gap-1.5 font-medium text-sm" style={{ color: colors.blueSlate }}>
                <FileText className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{workingGroup.activities?.length || 0}</span>
              </div>
            </div>
          </div>
          {/* Action menu - bottom right */}
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 relative z-10">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit?.(workingGroup.id)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Working Group
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = wgUrl}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = `/working-groups/new?parent_id=${workingGroup.id}&parent_label=${encodeURIComponent(workingGroup.label || '')}`}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Create Sub-Working Group
                </DropdownMenuItem>
                {onDelete && (
                  <DropdownMenuItem className="text-red-600" onClick={() => onDelete(workingGroup.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

export { WorkingGroupCardModern };
export default WorkingGroupCardModern;
