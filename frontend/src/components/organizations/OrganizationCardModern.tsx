'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Activity, DollarSign, ExternalLink, Copy } from 'lucide-react';
import { motion } from "framer-motion";
import { toast } from "sonner";
import { OrganizationCardActionMenu } from './OrganizationCardActionMenu';
import { useOrganizationBookmarks } from '@/hooks/use-organization-bookmarks';

// Color palette
const colors = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
};

interface Organization {
  id: string;
  name: string;
  acronym?: string;
  Organisation_Type_Code: string;
  Organisation_Type_Name?: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  logo?: string;
  banner?: string;
  country?: string;
  country_represented?: string;
  iati_org_id?: string;
  activeProjects: number;
  totalBudgeted?: number;
  totalDisbursed?: number;
}

interface OrganizationCardModernProps {
  organization: Organization;
  onEdit?: (org: Organization) => void;
  onDelete?: (org: Organization) => void;
  onExportPDF?: (orgId: string) => void;
  onExportExcel?: (orgId: string) => void;
  className?: string;
}

// Currency formatting utility
const formatCurrency = (value: number | undefined) => {
  if (!value) return '$0';
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

const OrganizationCardModern: React.FC<OrganizationCardModernProps> = ({
  organization,
  onEdit,
  onDelete,
  onExportPDF,
  onExportExcel,
  className = ''
}) => {
  const orgUrl = `/organizations/${organization.id}`;
  const { isBookmarked, toggleBookmark } = useOrganizationBookmarks();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Display ID - prefer IATI org ID, fallback to internal ID
  const displayId = organization.iati_org_id || organization.id.slice(0, 12);
  const idLabel = organization.iati_org_id ? 'IATI Org ID' : 'Org ID';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
      whileHover={{ y: -8 }}
      className={`group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer isolate overflow-hidden border ${className}`}
      style={{ backgroundColor: 'white' }}
      role="article"
      aria-label={`Organization: ${organization.name}`}
    >
      {/* Invisible link overlay - covers the card but sits below interactive elements */}
      <Link 
        href={orgUrl} 
        className="absolute inset-0 z-0"
        aria-label={`View ${organization.name}`}
      >
        <span className="sr-only">View organization</span>
      </Link>
      {/* Banner/Poster Section */}
      <div className="relative h-48 w-full overflow-hidden" style={{ backgroundColor: colors.blueSlate }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        {organization.banner ? (
          <motion.img
            src={organization.banner}
            alt={`${organization.name} banner`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Building2 className="h-16 w-16" style={{ color: colors.coolSteel, opacity: 0.3 }} />
          </div>
        )}

        {/* Action Menu - Top Left - z-30 to be above the link overlay (z-0) */}
        <div className="absolute top-4 left-4 z-30">
          <OrganizationCardActionMenu
            organizationId={organization.id}
            onEdit={onEdit ? () => onEdit(organization) : undefined}
            onExportPDF={onExportPDF ? () => onExportPDF(organization.id) : undefined}
            onExportExcel={onExportExcel ? () => onExportExcel(organization.id) : undefined}
            onDelete={onDelete ? () => onDelete(organization) : undefined}
            isBookmarked={isBookmarked(organization.id)}
            onToggleBookmark={() => toggleBookmark(organization.id)}
          />
        </div>

        {/* Title & Metadata - Bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-bold text-white mb-1 line-clamp-2 transition-colors">
              <Link
                href={orgUrl}
                className="relative z-10 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {organization.name}
                {organization.acronym && (
                  <span className="ml-1">({organization.acronym})</span>
                )}
              </Link>
            </h2>
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.paleSlate }}>
              {(organization.country_represented || organization.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {organization.country_represented || organization.country}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Logo Overlay - positioned outside banner to avoid overflow clipping */}
      {organization.logo && (
        <div className="absolute right-4 top-48 -translate-y-[75%] z-30">
          <div className="w-14 h-14 rounded-full border-4 shadow-lg overflow-hidden p-1" style={{ borderColor: colors.platinum, backgroundColor: 'white' }}>
            <img
              src={organization.logo}
              alt={`${organization.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col" style={{ backgroundColor: 'white' }}>
        <div className="flex-1">
          {/* Description */}
          {organization.description && (
            <p className="text-sm line-clamp-2 mb-4" style={{ color: colors.coolSteel }}>
              {organization.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Active Projects */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Activities
              </p>
              <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
                <Activity className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{organization.activeProjects || 0}</span>
              </div>
            </div>
            {/* Total Budgeted */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Total Budgeted
              </p>
              <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
                <DollarSign className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{formatCurrency(organization.totalBudgeted)}</span>
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
                  copyToClipboard(displayId);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                title="Copy ID"
              >
                <Copy className="w-3 h-3" style={{ color: colors.coolSteel }} />
              </button>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {organization.website && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(organization.website, '_blank');
                }}
                className="flex items-center gap-1 text-[10px] hover:underline relative z-10"
                style={{ color: colors.blueSlate }}
              >
                <ExternalLink className="w-3 h-3" />
                Visit Website
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrganizationCardModern;
