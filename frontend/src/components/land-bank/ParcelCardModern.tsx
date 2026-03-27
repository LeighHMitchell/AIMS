'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Layers, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ParcelStatusBadge } from './ParcelStatusBadge';
import { TitleStatusBadge } from './TitleStatusBadge';
import type { LandParcel } from '@/types/land-bank';
import { CardShell, CardShellRipLine, CardShellBottomSection } from '@/components/ui/card-shell';

const formatHectares = (val: number | null) => {
  if (!val) return '—';
  return `${val.toLocaleString()} ha`;
};

// Brand palette from CSS variables
const colors = {
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
  paleSlate: 'hsl(var(--brand-pale-slate))',
};

interface ParcelCardModernProps {
  parcel: LandParcel;
  className?: string;
}

const ParcelCardModern: React.FC<ParcelCardModernProps> = ({
  parcel,
  className = '',
}) => {
  const parcelUrl = `/land-bank/${parcel.id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <CardShell
      href={parcelUrl}
      ariaLabel={`Parcel: ${parcel.name}`}
      className={className}
      bannerIcon={Layers}
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
            <Link
              href={parcelUrl}
              className="relative z-10 hover:underline inline"
              onClick={(e) => e.stopPropagation()}
            >
              {parcel.name}
            </Link>{' '}
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
              <span className="text-xs font-mono font-normal bg-white/20 text-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                {parcel.parcel_code}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyToClipboard(parcel.parcel_code);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                title="Copy code"
              >
                <Copy className="w-3 h-3 text-white/70" />
              </button>
            </span>
          </h2>
          <div className="flex items-center gap-2 text-xs" style={{ color: colors.paleSlate }}>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {parcel.state_region}
              {parcel.township && `, ${parcel.township}`}
            </span>
          </div>
        </>
      }
    >
      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <ParcelStatusBadge status={parcel.status} />
          <TitleStatusBadge status={parcel.title_status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Size
            </p>
            <div className="flex items-center gap-2 font-medium text-sm" style={{ color: colors.blueSlate }}>
              <Layers className="w-4 h-4" style={{ color: colors.coolSteel }} />
              <span>{formatHectares(parcel.size_hectares)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Classification
            </p>
            <p className="text-sm font-medium truncate" style={{ color: colors.blueSlate }}>
              {parcel.classification || '—'}
            </p>
          </div>
        </div>
      </div>

      <CardShellRipLine />

      <CardShellBottomSection>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Ministry
            </p>
            <p className="text-xs font-medium truncate max-w-[180px]" style={{ color: colors.blueSlate }}>
              {parcel.controlling_ministry?.name || '—'}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Asset Type
            </p>
            <p className="text-xs font-medium" style={{ color: colors.blueSlate }}>
              {parcel.asset_type || '—'}
            </p>
          </div>
        </div>
      </CardShellBottomSection>
    </CardShell>
  );
};

export { ParcelCardModern };
export default ParcelCardModern;
