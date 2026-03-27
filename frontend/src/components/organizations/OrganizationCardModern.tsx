'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Activity, DollarSign, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationCardActionMenu } from './OrganizationCardActionMenu';
import { useOrganizationBookmarks } from '@/hooks/use-organization-bookmarks';
import { CardShell, CardShellLogoOverlay, CardShellRipLine } from '@/components/ui/card-shell';

// Color palette — uses brand tokens from CSS variables for theme compatibility
const colors = {
  paleSlate: 'hsl(var(--brand-pale-slate))',
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
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

  return (
    <CardShell
      href={orgUrl}
      ariaLabel={`Organization: ${organization.name}`}
      className={className}
      bannerImage={organization.banner}
      bannerIcon={Building2}
      bannerActions={
        <OrganizationCardActionMenu
          organizationId={organization.id}
          onEdit={onEdit ? () => onEdit(organization) : undefined}
          onExportPDF={onExportPDF ? () => onExportPDF(organization.id) : undefined}
          onExportExcel={onExportExcel ? () => onExportExcel(organization.id) : undefined}
          onDelete={onDelete ? () => onDelete(organization) : undefined}
          isBookmarked={isBookmarked(organization.id)}
          onToggleBookmark={() => toggleBookmark(organization.id)}
        />
      }
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 transition-colors">
            <Link
              href={orgUrl}
              className="relative z-10 hover:underline inline"
              onClick={(e) => e.stopPropagation()}
            >
              {organization.name}
              {organization.acronym && (
                <span className="ml-1">({organization.acronym})</span>
              )}
            </Link>
            {' '}
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
              <span className="text-xs font-mono font-normal bg-white/20 text-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm no-underline">{displayId}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyToClipboard(displayId);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                title="Copy ID"
              >
                <Copy className="w-3 h-3 text-white/70" />
              </button>
            </span>
          </h2>
          <div className="flex items-center gap-2 text-xs" style={{ color: colors.paleSlate }}>
            {(organization.country_represented || organization.country) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {organization.country_represented || organization.country}
              </span>
            )}
          </div>
        </>
      }
    >
      {/* Logo Overlay */}
      {organization.logo && (
        <CardShellLogoOverlay
          src={organization.logo}
          alt={`${organization.name} logo`}
        />
      )}

      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <div className="flex-1">
          {organization.description && (
            <p className="text-sm line-clamp-2 mb-4" style={{ color: colors.coolSteel }}>
              {organization.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Activities
              </p>
              <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
                <Activity className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{organization.activeProjects || 0}</span>
              </div>
            </div>
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
        <div className="my-4">
          <CardShellRipLine />
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-end">
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
    </CardShell>
  );
};

export default OrganizationCardModern;
