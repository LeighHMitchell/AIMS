'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, DollarSign, TrendingUp, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { ProjectBankProject } from '@/types/project-bank';

const STATUS_LABELS: Record<string, string> = {
  nominated: 'Nominated',
  screening: 'Screening',
  appraisal: 'Appraisal',
  approved: 'Approved',
  implementation: 'Implementation',
  completed: 'Completed',
  rejected: 'Rejected',
};

const STATUS_BADGE_VARIANT: Record<string, string> = {
  nominated: 'pb-entry',
  screening: 'pb-progress',
  appraisal: 'pb-review',
  approved: 'pb-approved',
  implementation: 'pb-active',
  completed: 'pb-done',
  rejected: 'pb-rejected',
};

const PATHWAY_LABELS: Record<string, string> = {
  oda: 'ODA',
  ppp: 'PPP',
  private_supported: 'Private (Supported)',
  private_unsupported: 'Private',
  domestic_budget: 'Domestic Budget',
};

const formatCurrency = (value: number | null | undefined) => {
  if (!value) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Brand palette from CSS variables
const colors = {
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
  paleSlate: 'hsl(var(--brand-pale-slate))',
};

interface ProjectCardModernProps {
  project: ProjectBankProject;
  className?: string;
}

const ProjectCardModern: React.FC<ProjectCardModernProps> = ({
  project,
  className = '',
}) => {
  const projectUrl = `/project-bank/${project.id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const fundingGapPercent = project.estimated_cost && project.funding_gap
    ? Math.round((project.funding_gap / project.estimated_cost) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      whileHover={{ y: -8 }}
      className={`group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer isolate overflow-hidden border bg-card ${className}`}
      role="article"
      aria-label={`Project: ${project.name}`}
    >
      {/* Invisible link overlay */}
      <Link
        href={projectUrl}
        className="absolute inset-0 z-0"
        aria-label={`View ${project.name}`}
      >
        <span className="sr-only">View project</span>
      </Link>

      {/* Banner Section */}
      <div className="relative h-48 w-full overflow-hidden" style={{ backgroundColor: colors.blueSlate }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <div className="h-full w-full flex items-center justify-center">
          <Building2 className="h-16 w-16" style={{ color: colors.coolSteel, opacity: 0.3 }} />
        </div>

        {/* Title & Metadata - Bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
              <Link
                href={projectUrl}
                className="relative z-10 hover:underline inline"
                onClick={(e) => e.stopPropagation()}
              >
                {project.name}
              </Link>{' '}
              <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
                <span className="text-xs font-mono font-normal bg-white/20 text-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  {project.project_code}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyToClipboard(project.project_code);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                  title="Copy code"
                >
                  <Copy className="w-3 h-3 text-white/70" />
                </button>
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.paleSlate }}>
              {project.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {project.region}
                </span>
              )}
              {project.sector && (
                <span>{project.sector}</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant={STATUS_BADGE_VARIANT[project.status] as any}>
            {STATUS_LABELS[project.status] || project.status}
          </Badge>
          {project.pathway && (
            <Badge variant="outline">{PATHWAY_LABELS[project.pathway] || project.pathway}</Badge>
          )}
        </div>

        {project.description && (
          <p className="text-sm line-clamp-2 mb-4 text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Estimated Cost
            </p>
            <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
              <DollarSign className="w-4 h-4" style={{ color: colors.coolSteel }} />
              <span>{formatCurrency(project.estimated_cost)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Funding Gap
            </p>
            <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
              <TrendingUp className="w-4 h-4" style={{ color: colors.coolSteel }} />
              <span>{formatCurrency(project.funding_gap)}</span>
            </div>
          </div>
        </div>

        {/* Funding gap bar */}
        {project.estimated_cost && project.estimated_cost > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: colors.paleSlate }}>
              <div
                className="h-full rounded-full bg-destructive"
                style={{ width: `${Math.min(fundingGapPercent, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {fundingGapPercent}% unfunded
            </p>
          </div>
        )}
      </div>

      {/* Rip Line */}
      <div className="relative flex items-center justify-center">
        <div className="absolute -left-5 h-10 w-10 rounded-full z-20 bg-background" />
        <div className="w-full border-t-2 border-dashed" style={{ borderColor: colors.paleSlate }} />
        <div className="absolute -right-5 h-10 w-10 rounded-full z-20 bg-background" />
      </div>

      {/* Bottom Section */}
      <div className="p-5 pt-3 bg-card rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Ministry
            </p>
            <p className="text-xs font-medium truncate max-w-[180px]" style={{ color: colors.blueSlate }}>
              {project.nominating_ministry || 'Not specified'}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Score
            </p>
            <p className="text-sm font-bold" style={{ color: colors.blueSlate }}>
              {project.firr != null ? `${project.firr.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export { ProjectCardModern };
export default ProjectCardModern;
