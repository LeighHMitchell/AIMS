'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Calendar, FileText, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
    members?: any[];
    meetings?: any[];
    activities?: any[];
  };
  className?: string;
}

const WorkingGroupCardModern: React.FC<WorkingGroupCardProps> = ({
  workingGroup,
  className = '',
}) => {
  const wgUrl = `/working-groups/${workingGroup.id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <CardShell
      href={wgUrl}
      ariaLabel={`Working Group: ${workingGroup.label}`}
      className={className}
      bannerIcon={Users}
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
            <Link
              href={wgUrl}
              className="relative z-10 hover:underline inline"
              onClick={(e) => e.stopPropagation()}
            >
              {workingGroup.label || 'Unnamed Group'}
            </Link>{' '}
            {workingGroup.code && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
                <span className="text-xs font-mono font-normal bg-white/20 text-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  {workingGroup.code}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyToClipboard(workingGroup.code!);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                  title="Copy code"
                >
                  <Copy className="w-3 h-3 text-white/70" />
                </button>
              </span>
            )}
          </h2>
        </>
      }
    >
      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={workingGroup.is_active ? 'success' : 'secondary'}>
            {workingGroup.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {workingGroup.description && (
          <p className="text-sm line-clamp-3 mb-4 text-muted-foreground">
            {workingGroup.description}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 mt-auto">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</p>
            <div className="flex items-center gap-1.5 font-medium text-sm" style={{ color: colors.blueSlate }}>
              <Users className="w-4 h-4" style={{ color: colors.coolSteel }} />
              <span>{workingGroup.members?.length || 0}</span>
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
      </div>
    </CardShell>
  );
};

export { WorkingGroupCardModern };
export default WorkingGroupCardModern;
