'use client';

import React, { useMemo, useState } from 'react';
import { MapPin, Building2 } from 'lucide-react';
import { MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, useMap } from '@/components/ui/map';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface SectorData {
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
  level?: string;
  percentage: number;
}

interface LocationData {
  id: string;
  activity_id: string;
  location_type: string;
  location_name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  site_type?: string;
  admin_unit?: string;
  coverage_scope?: string;
  state_region_code?: string;
  state_region_name?: string;
  township_code?: string;
  township_name?: string;
  district_name?: string;
  village_name?: string;
  city?: string;
  activity?: {
    id: string;
    title: string;
    status: string;
    organization_id: string;
    organization_name?: string;
    organization_acronym?: string;
    organization_logo?: string;
    sectors?: SectorData[];
    totalBudget?: number;
    totalPlannedDisbursement?: number;
    totalCommitments?: number;
    totalDisbursed?: number;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    banner?: string;
    icon?: string;
  } | null;
}

interface MarkersLayerProps {
  locations: LocationData[];
}

// Sector color palette
const SECTOR_COLORS: { [key: string]: string } = {
  '111': '#1e293b', '112': '#334155', '113': '#475569', '114': '#64748b',
  '121': '#0f172a', '122': '#374151', '123': '#4b5563', '130': '#6b7280',
  '140': '#059669', '150': '#0891b2', '151': '#0e7490', '152': '#155e75',
  '160': '#7c3aed', '210': '#dc2626', '220': '#ea580c', '230': '#ca8a04',
  '231': '#a16207', '232': '#84cc16', '233': '#65a30d', '240': '#2563eb',
  '250': '#4f46e5', '310': '#16a34a', '311': '#15803d', '312': '#166534',
  '313': '#14532d', '320': '#78716c', '321': '#57534e', '322': '#44403c',
  '323': '#292524', '330': '#be123c', '331': '#9f1239', '332': '#881337',
  '410': '#0d9488', '430': '#0f766e', '510': '#9333ea', '520': '#7e22ce',
  '530': '#6b21a8', '600': '#c026d3', '720': '#db2777', '730': '#be185d',
  '740': '#9d174d', '910': '#94a3b8', '930': '#cbd5e1', '998': '#e2e8f0',
};

const getSectorColor = (categoryCode?: string): string => {
  if (!categoryCode) return '#64748b';
  if (SECTOR_COLORS[categoryCode]) return SECTOR_COLORS[categoryCode];
  const prefix = categoryCode.substring(0, 3);
  if (SECTOR_COLORS[prefix]) return SECTOR_COLORS[prefix];
  return '#64748b';
};

const getStatusInfo = (status?: string): { label: string; color: string; bgColor: string } => {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    '1': { label: 'Pipeline', color: '#6b7280', bgColor: '#f3f4f6' },
    '2': { label: 'Implementation', color: '#ffffff', bgColor: '#3C6255' },
    '3': { label: 'Finalisation', color: '#d97706', bgColor: '#fef3c7' },
    '4': { label: 'Closed', color: '#374151', bgColor: '#e5e7eb' },
    '5': { label: 'Cancelled', color: '#dc2626', bgColor: '#fee2e2' },
    '6': { label: 'Suspended', color: '#6b7280', bgColor: '#f3f4f6' },
  };
  const key = status?.toLowerCase() || '';
  return statusMap[key] || statusMap[status || ''] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
};

const formatCompactCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null || amount === 0) return '$0';
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absAmount >= 1000000000) {
    const value = absAmount / 1000000000;
    return `${sign}$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}b`;
  } else if (absAmount >= 1000000) {
    const value = absAmount / 1000000;
    return `${sign}$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}m`;
  } else if (absAmount >= 1000) {
    const value = absAmount / 1000;
    return `${sign}$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}k`;
  }
  return `${sign}$${absAmount.toFixed(0)}`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '-';
  }
};

const getFullAddress = (location: LocationData): string => {
  const parts = [];
  if (location.address) parts.push(location.address);
  if (location.village_name) parts.push(location.village_name);
  if (location.township_name) parts.push(location.township_name);
  if (location.district_name) parts.push(location.district_name);
  if (location.state_region_name) parts.push(location.state_region_name);
  if (location.city) parts.push(location.city);
  return parts.join(', ') || '-';
};

// Timeline progress visualization component
function TimelineProgress({ 
  actualStartDate, 
  plannedEndDate 
}: { 
  actualStartDate?: string; 
  plannedEndDate?: string;
}) {
  if (!actualStartDate || !plannedEndDate) return null;
  
  const startDate = new Date(actualStartDate);
  const endDate = new Date(plannedEndDate);
  const today = new Date();
  
  // Calculate total duration and elapsed time
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsedTime = today.getTime() - startDate.getTime();
  
  // Calculate progress percentage (capped at 100%)
  let progressPercent = totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;
  progressPercent = Math.max(0, Math.min(100, progressPercent));
  
  const formatTimelineDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };
  
  return (
    <div className="mb-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-2">Project Timeline</div>
      
      {/* Date labels */}
      <div className="flex justify-between mb-1.5">
        <div>
          <div className="text-[10px] text-slate-400">Actual Start</div>
          <div className="text-xs font-semibold text-slate-800">{formatTimelineDate(actualStartDate)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">Planned End</div>
          <div className="text-xs font-semibold text-slate-800">{formatTimelineDate(plannedEndDate)}</div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-3 mb-1.5">
        <div className="absolute inset-0 flex rounded-sm overflow-hidden">
          {/* Completed portion */}
          <div 
            className="h-full" 
            style={{ 
              width: `${progressPercent}%`, 
              backgroundColor: '#1e3a5f' 
            }} 
          />
          {/* Remaining portion */}
          <div 
            className="h-full" 
            style={{ 
              width: `${100 - progressPercent}%`, 
              backgroundColor: '#c7d9ed' 
            }} 
          />
        </div>
        {/* Progress marker line */}
        <div 
          className="absolute top-0 h-full w-0.5"
          style={{ 
            left: `${progressPercent}%`,
            backgroundColor: '#0f2744',
            transform: 'translateX(-50%)'
          }}
        />
      </div>
      
      {/* Progress percentage */}
      <div className="flex justify-end">
        <div className="text-right">
          <div className="text-[10px] text-slate-400">Progress by time</div>
          <div className="text-xs font-semibold text-slate-800">{Math.round(progressPercent)}%</div>
        </div>
      </div>
    </div>
  );
}

// Individual sector segment component with hover
function SectorSegment({ sector, width }: { sector: SectorData & { normalizedPercentage: number }, width: number }) {
  const color = getSectorColor(sector.categoryCode || sector.code);
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          style={{ width: `${width}%`, backgroundColor: color }}
          className="h-full cursor-pointer"
        />
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-auto p-2 px-3" 
        side="top" 
        align="center"
        style={{ backgroundColor: 'white' }}
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div 
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-mono text-slate-700">{sector.code}</span>
          <span className="text-xs text-slate-700">{sector.name || sector.categoryName || 'Unknown Sector'}</span>
          <span className="text-xs font-semibold text-slate-800">{sector.percentage}%</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// Sector breakdown bar component with individual hover
function SectorBar({ sectors }: { sectors?: SectorData[] }) {
  if (!sectors || sectors.length === 0) return null;
  
  const totalPercentage = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  const normalizedSectors = sectors.map(s => ({
    ...s,
    normalizedPercentage: totalPercentage > 0 ? ((s.percentage || 0) / totalPercentage) * 100 : 100 / sectors.length
  }));
  
  return (
    <div className="mb-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1.5">Sector Breakdown</div>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
        {normalizedSectors.map((sector, idx) => {
          const width = Math.max(sector.normalizedPercentage, 2);
          return (
            <SectorSegment
              key={idx}
              sector={sector}
              width={width}
            />
          );
        })}
      </div>
    </div>
  );
}

// Individual marker component
function LocationMarker({ location }: { location: LocationData }) {
  const { map } = useMap();
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  const statusInfo = getStatusInfo(location.activity?.status);
  
  if (isNaN(lat) || isNaN(lng)) return null;

  const handleClick = () => {
    if (map) {
      // Position marker at the very top center of the map
      const container = map.getContainer();
      const mapHeight = container.clientHeight;
      map.easeTo({
        center: [lng, lat],
        padding: { top: 60, bottom: mapHeight - 100 }, // Push marker to top of map
        duration: 500,
      });
    }
  };

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 14, // Safe zoom level that works with satellite imagery
        duration: 1500,
      });
    }
  };

  return (
    <MapMarker
      longitude={lng}
      latitude={lat}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Custom marker appearance */}
      <MarkerContent>
        <MapPin
          className="fill-[#DC2625] stroke-white"
          size={28}
        />
      </MarkerContent>

      {/* Tooltip on hover */}
      <MarkerTooltip className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden">
        {/* Banner */}
        {location.activity?.banner && (
          <div className="w-full h-16 overflow-hidden">
            <img src={location.activity.banner} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="p-2.5">
          {/* Title */}
          <div className="font-semibold text-xs text-slate-700 mb-2 line-clamp-2">
            {location.activity?.title || 'Untitled Activity'}
          </div>
          
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="text-slate-500">Location</div>
            <div className="text-slate-700 truncate">{location.location_name || 'Unnamed'}</div>
            
            {location.activity?.organization_name && (
              <>
                <div className="text-slate-500">Organisation</div>
                <div className="text-slate-700 truncate">{location.activity.organization_name}</div>
              </>
            )}
            
            <div className="text-slate-500">Status</div>
            <div className="text-slate-700">{statusInfo.label}</div>
          </div>
        </div>
      </MarkerTooltip>

      {/* Popup on click */}
      <MarkerPopup className="!p-0 !bg-white !text-foreground min-w-[350px] max-w-[420px] overflow-hidden" closeButton>
        {/* Banner */}
        {location.activity?.banner && (
          <div className="w-full h-24 overflow-hidden -m-3 mb-3" style={{ width: 'calc(100% + 24px)' }}>
            <img src={location.activity.banner} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        
        {/* Title - Clickable to view activity */}
        <a 
          href={`/activities/${location.activity_id}`}
          className="block text-base font-semibold text-slate-800 mb-3 leading-tight hover:text-slate-600 cursor-pointer transition-colors pr-6"
        >
          {location.activity?.title || 'Untitled Activity'}
        </a>
        
        <hr className="border-slate-200 mb-3" />
        
        {/* Reporting Organisation */}
        <div className="mb-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">Reporting Organisation</div>
          <div className="flex items-center gap-2">
            {location.activity?.organization_logo ? (
              <img 
                src={location.activity.organization_logo} 
                alt="" 
                className="h-6 w-6 rounded object-contain flex-shrink-0"
              />
            ) : (
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-slate-400" />
              </div>
            )}
            <span className="text-xs text-slate-700">
              {location.activity?.organization_name || '-'}
              {location.activity?.organization_acronym && location.activity?.organization_acronym !== location.activity?.organization_name && (
                <span className="text-slate-700"> ({location.activity.organization_acronym})</span>
              )}
            </span>
          </div>
        </div>
        
        {/* Status */}
        <div className="mb-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">Status</div>
          <Badge 
            variant="secondary" 
            className="text-xs px-2 py-0.5"
            style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
          >
            {statusInfo.label}
          </Badge>
        </div>
        
        {/* Address */}
        <div className="mb-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-0.5">Address</div>
          <div className="text-xs text-slate-700 leading-snug">{getFullAddress(location)}</div>
        </div>
        
        {/* Divider */}
        <hr className="border-slate-200 mb-3" />
        
        {/* Coordinates */}
        <div className="mb-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-0.5">Coordinates</div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
            <a 
              href={`https://www.google.com/maps?q=${lat},${lng}&t=k`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Google Maps"
              className="hover:opacity-80"
            >
              <img 
                src="https://www.gstatic.com/marketing-cms/assets/images/0f/9a/58f1d92b46069b4a8bdc556b612c/google-maps.webp" 
                alt="Open in Google Maps" 
                className="h-4 w-4"
              />
            </a>
          </div>
        </div>
        
        {/* Divider */}
        <hr className="border-slate-200 mb-3" />
        
        {/* Sector Breakdown */}
        <SectorBar sectors={location.activity?.sectors} />
        
        {/* Divider */}
        <hr className="border-slate-200 mb-3" />
        
        {/* Financial Summary */}
        <div className="mb-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1.5">Financial Summary</div>
          <div className="rounded border border-slate-200 overflow-hidden">
            <div className="flex justify-between px-2.5 py-1.5 bg-white">
              <span className="text-xs text-slate-500">Total Budgeted</span>
              <span className="text-xs font-semibold text-slate-800">{formatCompactCurrency(location.activity?.totalBudget)}</span>
            </div>
            <div className="flex justify-between px-2.5 py-1.5 bg-slate-50">
              <span className="text-xs text-slate-500">Total Planned Disbursement</span>
              <span className="text-xs font-semibold text-slate-800">{formatCompactCurrency(location.activity?.totalPlannedDisbursement)}</span>
            </div>
            <div className="flex justify-between px-2.5 py-1.5 bg-white">
              <span className="text-xs text-slate-500">Total Committed</span>
              <span className="text-xs font-semibold text-slate-800">{formatCompactCurrency(location.activity?.totalCommitments)}</span>
            </div>
            <div className="flex justify-between px-2.5 py-1.5 bg-slate-50">
              <span className="text-xs text-slate-500">Total Disbursed</span>
              <span className="text-xs font-semibold text-slate-800">{formatCompactCurrency(location.activity?.totalDisbursed)}</span>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <hr className="border-slate-200 mb-3" />
        
        {/* Timeline Progress Visualization */}
        <TimelineProgress 
          actualStartDate={location.activity?.actualStartDate} 
          plannedEndDate={location.activity?.plannedEndDate} 
        />
        
      </MarkerPopup>
    </MapMarker>
  );
}

export default function MarkersLayer({ locations }: MarkersLayerProps) {
  // For performance with many markers, we could use MapClusterLayer instead
  // For now, render individual markers (good for up to ~500 points)
  
  return (
    <>
      {locations.map(location => (
        <LocationMarker key={location.id} location={location} />
      ))}
    </>
  );
}
