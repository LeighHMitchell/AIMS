"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ArrowUpDown, ArrowUp, ArrowDown, Leaf, Wind, Waves, TreePine, MountainSnow, Sparkles, Shield, Handshake, Baby, AlertCircle, Heart, Droplets, Wrench } from 'lucide-react';

interface PolicyMarkerDetails {
  uuid: string;
  code: string;
  name: string;
  description?: string;
  marker_type: 'environmental' | 'social_governance' | 'other' | 'custom';
  vocabulary?: string;
  iati_code?: string;
  is_iati_standard?: boolean;
}

interface ActivityPolicyMarker {
  policy_marker_id: string;
  significance: 0 | 1 | 2 | 3 | 4;
  rationale?: string;
  policy_marker_details?: PolicyMarkerDetails;
}

interface PolicyMarkersAnalyticsTabProps {
  policyMarkers: ActivityPolicyMarker[];
  activityTitle?: string;
}

// Helper function to get significance label
const getSignificanceLabel = (significance: number): string => {
  switch (significance) {
    case 0: return "Not Targeted";
    case 1: return "Significant";
    case 2: return "Principal";
    case 3: return "Principal (Enhanced)";
    case 4: return "Primary Objective";
    default: return "Unknown";
  }
};

// Helper function to get significance color
const getSignificanceColor = (significance: number): string => {
  switch (significance) {
    case 0: return "bg-slate-100 text-slate-800";
    case 1: return "bg-blue-100 text-blue-800";
    case 2: return "bg-green-100 text-green-800";
    case 3: return "bg-yellow-100 text-yellow-800";
    case 4: return "bg-red-100 text-red-800";
    default: return "bg-slate-100 text-slate-800";
  }
};

// Helper function to get category label
const getCategoryLabel = (markerType: string): string => {
  switch (markerType) {
    case 'environmental': return 'Environmental';
    case 'social_governance': return 'Social & Governance';
    case 'other': return 'Other Cross-Cutting';
    case 'custom': return 'Custom';
    default: return markerType;
  }
};

// Get icon for policy marker
const getIconForMarker = (iatiCode?: string) => {
  switch (iatiCode) {
    case '1': return Sparkles; // Gender Equality
    case '2': return Leaf; // Aid to Environment
    case '3': return Shield; // Good Governance
    case '4': return Handshake; // Trade Development
    case '5': return TreePine; // Biodiversity
    case '6': return Wind; // Climate Mitigation
    case '7': return Waves; // Climate Adaptation
    case '8': return MountainSnow; // Desertification
    case '9': return Baby; // RMNCH
    case '10': return AlertCircle; // Disaster Risk Reduction
    case '11': return Heart; // Disability
    case '12': return Droplets; // Nutrition
    default: return Wrench; // Default/Other
  }
};

// Rio Markers (Climate and Environment)
const RIO_MARKER_CODES = ['5', '6', '7', '8']; // Biodiversity, Climate Mitigation, Climate Adaptation, Desertification

export function PolicyMarkersAnalyticsTab({ policyMarkers, activityTitle }: PolicyMarkersAnalyticsTabProps) {
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter out markers with significance 0 (not targeted)
  const activeMarkers = useMemo(() =>
    policyMarkers.filter(m => m.significance > 0),
    [policyMarkers]
  );

  // Sort markers
  const sortedMarkers = useMemo(() => {
    if (!sortField) return activeMarkers;

    return [...activeMarkers].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.policy_marker_details?.name || '';
          bVal = b.policy_marker_details?.name || '';
          break;
        case 'category':
          aVal = a.policy_marker_details?.marker_type || '';
          bVal = b.policy_marker_details?.marker_type || '';
          break;
        case 'significance':
          aVal = a.significance;
          bVal = b.significance;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeMarkers, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Significance distribution data
  const significanceData = useMemo(() => {
    const counts = activeMarkers.reduce((acc, marker) => {
      const label = getSignificanceLabel(marker.significance);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [activeMarkers]);

  // Category distribution data
  const categoryData = useMemo(() => {
    const counts = activeMarkers.reduce((acc, marker) => {
      const category = getCategoryLabel(marker.policy_marker_details?.marker_type || 'other');
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeMarkers]);

  // Rio Markers
  const rioMarkers = useMemo(() =>
    activeMarkers.filter(m => RIO_MARKER_CODES.includes(m.policy_marker_details?.iati_code || '')),
    [activeMarkers]
  );

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (activeMarkers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium">No Policy Markers Selected</p>
          <p className="text-sm">Add policy markers in the Activity Editor to see analytics here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Policy Markers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Markers</CardTitle>
          <CardDescription>
            Complete list of all policy markers applied to this activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-slate-900"
                    >
                      Policy Marker
                      {getSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-2 hover:text-slate-900"
                    >
                      Category
                      {getSortIcon('category')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <button
                      onClick={() => handleSort('significance')}
                      className="flex items-center gap-2 hover:text-slate-900"
                    >
                      Significance
                      {getSortIcon('significance')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMarkers.map((marker) => {
                  const IconComponent = getIconForMarker(marker.policy_marker_details?.iati_code);
                  return (
                    <TableRow key={marker.policy_marker_id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-5 h-5 text-slate-600" />
                          <div>
                            <div className="font-medium text-slate-900">
                              {marker.policy_marker_details?.name || 'Unknown Marker'}
                            </div>
                            {marker.policy_marker_details?.iati_code && (
                              <div className="text-xs text-slate-500 font-mono">
                                IATI Code: {marker.policy_marker_details.iati_code}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-300">
                          {getCategoryLabel(marker.policy_marker_details?.marker_type || 'other')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSignificanceColor(marker.significance)}>
                          {getSignificanceLabel(marker.significance)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {marker.rationale || <span className="italic text-slate-400">No rationale provided</span>}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
