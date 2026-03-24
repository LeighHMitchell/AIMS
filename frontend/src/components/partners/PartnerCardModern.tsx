'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Globe, MapPin, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { Partner } from '@/hooks/usePartners';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      whileHover={{ y: -8 }}
      className={`group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer isolate overflow-hidden border bg-card ${className}`}
      role="article"
      aria-label={`Partner: ${partner.name}`}
    >
      {/* Invisible link overlay */}
      <Link
        href={partnerUrl}
        className="absolute inset-0 z-0"
        aria-label={`View ${partner.name}`}
      >
        <span className="sr-only">View partner</span>
      </Link>

      {/* Banner Section */}
      <div className="relative h-48 w-full overflow-hidden" style={{ backgroundColor: colors.blueSlate }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        {partner.banner ? (
          <img
            src={partner.banner}
            alt={`${partner.name} banner`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Building2 className="h-16 w-16" style={{ color: colors.coolSteel, opacity: 0.3 }} />
          </div>
        )}

        {/* Logo Overlay */}
        {partner.logo && (
          <div className="absolute right-4 bottom-[-20px] z-30">
            <div className="w-14 h-14 rounded-full border-4 shadow-lg overflow-hidden p-1 bg-card" style={{ borderColor: colors.paleSlate }}>
              <img
                src={partner.logo}
                alt={`${partner.name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Title - Bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
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
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.paleSlate }}>
              {partner.countryRepresented && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {partner.countryRepresented}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

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
          <p className="text-sm line-clamp-2 mb-4 text-muted-foreground">
            {partner.description}
          </p>
        )}

        <div className="mt-auto space-y-2">
          {partner.website && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" style={{ color: colors.coolSteel }} />
              <span className="truncate">{partner.website.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
          {partner.iatiOrgId && (
            <div className="flex items-center gap-2 text-xs">
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
    </motion.div>
  );
};

export { PartnerCardModern };
export default PartnerCardModern;
