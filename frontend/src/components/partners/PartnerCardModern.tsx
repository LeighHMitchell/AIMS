'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Globe, MapPin, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { Partner } from '@/hooks/usePartners';
import { CardShell, CardShellLogoOverlay } from '@/components/ui/card-shell';

// Brand palette from CSS variables
const colors = {
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
  paleSlate: 'hsl(var(--brand-pale-slate))',
};

interface PartnerCardModernProps {
  partner: Partner;
  className?: string;
}

const PartnerCardModern: React.FC<PartnerCardModernProps> = ({
  partner,
  className = '',
}) => {
  const partnerUrl = `/partners/${partner.id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <CardShell
      href={partnerUrl}
      ariaLabel={`Partner: ${partner.name}`}
      className={className}
      bannerImage={partner.banner}
      bannerIcon={Building2}
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
            <Link
              href={partnerUrl}
              className="relative z-10 hover:underline inline"
              onClick={(e) => e.stopPropagation()}
            >
              {partner.name}
              {partner.acronym && <span className="ml-1">({partner.acronym})</span>}
            </Link>
          </h2>
          <div className="flex items-center gap-2 text-helper" style={{ color: colors.paleSlate }}>
            {partner.countryRepresented && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {partner.countryRepresented}
              </span>
            )}
          </div>
        </>
      }
    >
      {/* Logo Overlay — standardized position */}
      {partner.logo && (
        <CardShellLogoOverlay
          src={partner.logo}
          alt={`${partner.name} logo`}
        />
      )}

      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {partner.orgClassification && (
            <Badge variant="outline">{partner.orgClassification}</Badge>
          )}
          {partner.cooperationModality && (
            <Badge variant="secondary">{partner.cooperationModality}</Badge>
          )}
        </div>

        {partner.description && (
          <p className="text-body line-clamp-2 mb-4 text-muted-foreground">
            {partner.description}
          </p>
        )}

        <div className="mt-auto space-y-2">
          {partner.website && (
            <div className="flex items-center gap-2 text-body text-muted-foreground">
              <Globe className="w-4 h-4" style={{ color: colors.coolSteel }} />
              <span className="truncate">{partner.website.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
          {partner.iatiOrgId && (
            <div className="flex items-center gap-2 text-helper">
              <span className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {partner.iatiOrgId}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyToClipboard(partner.iatiOrgId!);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                title="Copy IATI ID"
              >
                <Copy className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
};

export { PartnerCardModern };
export default PartnerCardModern;
