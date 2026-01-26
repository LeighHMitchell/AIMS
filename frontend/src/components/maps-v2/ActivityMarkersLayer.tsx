'use client';

import React from 'react';
import { MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, useMap } from '@/components/ui/map';
import { Badge } from '@/components/ui/badge';
import type { LocationSchema } from '@/lib/schemas/location';

interface SectorData {
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
  level?: string;
  percentage: number;
}

interface ActivityData {
  id: string;
  title: string;
  status?: string;
  organization_name?: string;
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
}

interface ActivityMarkersLayerProps {
  locations: LocationSchema[];
  activity?: ActivityData;
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
    '2': { label: 'Implementation', color: '#059669', bgColor: '#d1fae5' },
    '3': { label: 'Finalisation', color: '#d97706', bgColor: '#fef3c7' },
    '4': { label: 'Closed', color: '#374151', bgColor: '#e5e7eb' },
    '5': { label: 'Cancelled', color: '#dc2626', bgColor: '#fee2e2' },
    '6': { label: 'Suspended', color: '#9333ea', bgColor: '#f3e8ff' },
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

// Format site type for display
const formatSiteType = (siteType?: string): string => {
  if (!siteType) return '-';
  return siteType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getFullAddress = (location: LocationSchema): string => {
  const parts = [];
  if ('address' in location && location.address) parts.push(location.address);
  if ('village_name' in location && location.village_name) parts.push(location.village_name);
  if ('township_name' in location && location.township_name) parts.push(location.township_name);
  if ('district_name' in location && location.district_name) parts.push(location.district_name);
  if ('state_region_name' in location && location.state_region_name) parts.push(location.state_region_name);
  if ('city' in location && location.city) parts.push(location.city);
  return parts.join(', ') || '-';
};

// Sector breakdown bar component
function SectorBar({ sectors }: { sectors?: SectorData[] }) {
  if (!sectors || sectors.length === 0) return null;
  
  const totalPercentage = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  const normalizedSectors = sectors.map(s => ({
    ...s,
    normalizedPercentage: totalPercentage > 0 ? ((s.percentage || 0) / totalPercentage) * 100 : 100 / sectors.length
  }));
  
  return (
    <div className="mb-3">
      <div className="text-[10px] font-semibold text-slate-500 mb-1.5">Sector Breakdown</div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
        {normalizedSectors.map((sector, idx) => {
          const color = getSectorColor(sector.categoryCode || sector.code);
          const width = Math.max(sector.normalizedPercentage, 2);
          return (
            <div
              key={idx}
              style={{ width: `${width}%`, backgroundColor: color }}
              className="h-full"
              title={`${sector.name || sector.categoryName}: ${sector.percentage}%`}
            />
          );
        })}
      </div>
    </div>
  );
}

// Individual marker component for activity locations
function ActivityLocationMarker({ 
  location, 
  activity 
}: { 
  location: LocationSchema; 
  activity?: ActivityData;
}) {
  const { map } = useMap();
  
  // Only site locations have coordinates
  if (location.location_type !== 'site') return null;
  
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  const statusInfo = getStatusInfo(activity?.status);
  
  if (isNaN(lat) || isNaN(lng)) return null;

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
      onDoubleClick={handleDoubleClick}
    >
      {/* Custom marker appearance */}
      <MarkerContent>
        <div className="size-4 rounded-full bg-primary border-2 border-white shadow-lg" />
      </MarkerContent>

      {/* Tooltip on hover */}
      <MarkerTooltip className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden">
        {/* Banner */}
        {activity?.banner ? (
          <div className="w-full h-16 overflow-hidden">
            <img src={activity.banner} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-12 bg-gradient-to-r from-slate-600 to-slate-400" />
        )}
        
        <div className="p-2.5">
          {/* Title */}
          <div className="font-semibold text-xs text-slate-700 mb-2 line-clamp-2">
            {activity?.title || 'Untitled Activity'}
          </div>
          
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="text-slate-500">Location</div>
            <div className="text-slate-700 truncate">{location.location_name || 'Unnamed'}</div>
            
            {activity?.organization_name && (
              <>
                <div className="text-slate-500">Organisation</div>
                <div className="text-slate-700 truncate">{activity.organization_name}</div>
              </>
            )}
            
            <div className="text-slate-500">Status</div>
            <div className="text-slate-700">{statusInfo.label}</div>
            
            {'site_type' in location && location.site_type && (
              <>
                <div className="text-slate-500">Site Type</div>
                <div className="text-slate-700">{formatSiteType(location.site_type)}</div>
              </>
            )}
          </div>
        </div>
      </MarkerTooltip>

      {/* Popup on click */}
      <MarkerPopup className="!p-0 !bg-white !text-foreground min-w-[350px] max-w-[420px] overflow-hidden" closeButton>
        {/* Banner */}
        {activity?.banner ? (
          <div className="w-full h-24 overflow-hidden -m-3 mb-3" style={{ width: 'calc(100% + 24px)' }}>
            <img src={activity.banner} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-16 bg-gradient-to-r from-slate-600 to-slate-400 -m-3 mb-3" style={{ width: 'calc(100% + 24px)' }} />
        )}
        
        {/* Location Name */}
        <h3 className="font-bold text-base text-slate-700 mb-1 leading-tight">
          {location.location_name || 'Unnamed Location'}
        </h3>
        
        {/* Activity Title */}
        <div className="text-xs text-slate-500 mb-3">
          {activity?.title || 'Untitled Activity'}
        </div>
        
        <hr className="border-slate-200 mb-3" />
        
        {/* Two column info */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div>
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Organisation</div>
            <div className="text-slate-700">{activity?.organization_name || '-'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Status</div>
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0"
              style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        
        {/* Site Type */}
        {'site_type' in location && location.site_type && (
          <div className="text-xs mb-3">
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Site Type</div>
            <div className="text-slate-700">{formatSiteType(location.site_type)}</div>
          </div>
        )}
        
        {/* Address */}
        <div className="text-xs mb-3">
          <div className="text-slate-500 text-[10px] font-medium mb-0.5">Address</div>
          <div className="text-slate-700 leading-snug">{getFullAddress(location)}</div>
        </div>
        
        {/* Coordinates */}
        <div className="text-xs mb-3">
          <div className="text-slate-500 text-[10px] font-medium mb-0.5">Coordinates</div>
          <div className="font-mono text-[10px] text-slate-700 bg-slate-50 px-2 py-1 rounded inline-block">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>
        </div>
        
        {/* Description */}
        {(location.description || location.location_description || ('activity_location_description' in location && location.activity_location_description)) && (
          <div className="text-xs mb-3">
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Description</div>
            <div className="text-slate-700 leading-snug italic">
              {location.description || location.location_description || ('activity_location_description' in location && location.activity_location_description)}
            </div>
          </div>
        )}
        
        {/* Sector Breakdown */}
        <SectorBar sectors={activity?.sectors} />
        
        {/* Financial Summary */}
        {activity && (activity.totalBudget || activity.totalPlannedDisbursement || activity.totalCommitments || activity.totalDisbursed) && (
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-500 mb-1.5">Financial Summary</div>
            <div className="rounded border border-slate-200 overflow-hidden text-xs">
              <div className="flex justify-between px-2.5 py-1.5 bg-white">
                <span className="text-slate-500">Total Budgeted</span>
                <span className="font-semibold text-slate-700">{formatCompactCurrency(activity.totalBudget)}</span>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 bg-slate-50">
                <span className="text-slate-500">Total Planned Disbursement</span>
                <span className="font-semibold text-slate-700">{formatCompactCurrency(activity.totalPlannedDisbursement)}</span>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 bg-white">
                <span className="text-slate-500">Total Committed</span>
                <span className="font-semibold text-slate-700">{formatCompactCurrency(activity.totalCommitments)}</span>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 bg-slate-50">
                <span className="text-slate-500">Total Disbursed</span>
                <span className="font-semibold text-slate-700">{formatCompactCurrency(activity.totalDisbursed)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Timeline */}
        {activity && (activity.plannedStartDate || activity.plannedEndDate || activity.actualStartDate || activity.actualEndDate) && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 mb-1.5">Project Timeline</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="text-slate-500">Planned Start: <span className="font-medium text-slate-700">{formatDate(activity.plannedStartDate)}</span></div>
              <div className="text-slate-500">Planned End: <span className="font-medium text-slate-700">{formatDate(activity.plannedEndDate)}</span></div>
              <div className="text-slate-500">Actual Start: <span className="font-medium text-slate-700">{formatDate(activity.actualStartDate)}</span></div>
              <div className="text-slate-500">Actual End: <span className="font-medium text-slate-700">{activity.actualEndDate ? formatDate(activity.actualEndDate) : 'N/A'}</span></div>
            </div>
          </div>
        )}
        
        {/* View Activity Link */}
        {activity?.id && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <a 
              href={`/activities/${activity.id}`}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              View Full Activity Details →
            </a>
          </div>
        )}
      </MarkerPopup>
    </MapMarker>
  );
}

export default function ActivityMarkersLayer({ locations, activity }: ActivityMarkersLayerProps) {
  // Filter to only site locations with valid coordinates
  const validLocations = locations.filter(loc => {
    if (loc.location_type !== 'site') return false;
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });
  
  return (
    <>
      {validLocations.map(location => (
        <ActivityLocationMarker 
          key={location.id || `${location.latitude}-${location.longitude}`} 
          location={location} 
          activity={activity}
        />
      ))}
    </>
  );
}
