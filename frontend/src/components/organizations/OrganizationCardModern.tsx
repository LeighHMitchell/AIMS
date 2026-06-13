'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Activity } from 'lucide-react';
import { OrganizationCardActionMenu } from './OrganizationCardActionMenu';
import { useOrganizationBookmarks } from '@/hooks/use-organization-bookmarks';
import { CardShell, CardShellLogoOverlay } from '@/components/ui/card-shell';
import { CopyableIdBadge } from '@/components/ui/copyable-id-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyValue } from '@/components/ui/currency-value';

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
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (orgId: string, checked: boolean) => void;
}

const OrganizationCardModern: React.FC<OrganizationCardModernProps> = ({
  organization,
  onEdit,
  onDelete,
  onExportPDF,
  onExportExcel,
  className = '',
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const orgUrl = `/organizations/${organization.id}`;
  const { isBookmarked, toggleBookmark } = useOrganizationBookmarks();

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
        <div className="flex items-center gap-2">
          {selectable && (
            <div
              className="rounded bg-white/90 p-1 shadow-sm backdrop-blur-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Checkbox
                aria-label={`Select ${organization.name}`}
                checked={selected}
                onCheckedChange={(checked) =>
                  onToggleSelect?.(organization.id, !!checked)
                }
              />
            </div>
          )}
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
      }
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 transition-colors">
            <Link
              href={orgUrl}
              className="relative z-10 no-underline hover:no-underline inline"
              onClick={(e) => e.stopPropagation()}
            >
              {organization.name}
              {organization.acronym && (
                <span className="ml-1">({organization.acronym})</span>
              )}
            </Link>
            {' '}
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle relative z-10">
              <CopyableIdBadge
                value={displayId}
                label={organization.iati_org_id ? 'IATI Org ID' : 'Org ID'}
                className="text-white/80 bg-white/20 hover:bg-white/30 hover:text-white backdrop-blur-sm no-underline"
              />
            </span>
          </h2>
          <div className="flex items-center gap-2 text-helper" style={{ color: colors.paleSlate }}>
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
            <p className="text-body line-clamp-2 mb-4" style={{ color: colors.coolSteel }}>
              {organization.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Activities
              </p>
              <div className="flex items-center gap-2 font-medium text-body" style={{ color: colors.blueSlate }}>
                <Activity className="w-4 h-4" style={{ color: colors.coolSteel }} />
                <span>{organization.activeProjects || 0}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Total Budgeted
              </p>
              <div className="flex items-baseline gap-1 font-medium text-body" style={{ color: colors.blueSlate }}>
                <span>
                  <CurrencyValue amount={organization.totalBudgeted} variant="short" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

export default OrganizationCardModern;
