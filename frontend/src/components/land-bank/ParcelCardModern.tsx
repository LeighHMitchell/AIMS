'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Layers, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ParcelStatusBadge } from './ParcelStatusBadge';
import { TitleStatusBadge } from './TitleStatusBadge';
import type { LandParcel } from '@/types/land-bank';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      whileHover={{ y: -8 }}
      className={`group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer isolate overflow-hidden border bg-card ${className}`}
      role="article"
      aria-label={`Parcel: ${parcel.name}`}
    >
      {/* Invisible link overlay */}
      <Link
        href={parcelUrl}
        className="absolute inset-0 z-0"
        aria-label={`View ${parcel.name}`}
      >
        <span className="sr-only">View parcel</span>
      </Link>

      {/* Banner Section */}
      <div className="relative h-48 w-full overflow-hidden" style={{ backgroundColor: colors.blueSlate }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <div className="h-full w-full flex items-center justify-center">
          <Layers className="h-16 w-16" style={{ color: colors.coolSteel, opacity: 0.3 }} />
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
          </motion.div>
        </div>
      </div>

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
      </div>
    </motion.div>
  );
};

export { ParcelCardModern };
export default ParcelCardModern;
