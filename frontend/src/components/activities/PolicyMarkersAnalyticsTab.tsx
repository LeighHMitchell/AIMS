"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
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
    case 1: return "Significant Objective";
    case 2: return "Principal Objective";
    case 3: return "Principal Objective (Enhanced)";
    case 4: return "Primary Objective";
    default: return "Unknown";
  }
};

// Helper function to get significance explanation tooltip text
const getSignificanceExplanation = (iatiCode: string | undefined, markerName: string | undefined, significance: number): string => {
  // Normalize marker name for matching (case-insensitive)
  const normalizedName = (markerName || '').toLowerCase();
  
  // Determine marker type - check both IATI code and name
  const isNutrition = iatiCode === '12' || normalizedName.includes('nutrition');
  const isEnvironment = iatiCode === '2' || (normalizedName.includes('environment') && !normalizedName.includes('climate'));
  const isClimateMitigation = iatiCode === '6' || normalizedName.includes('climate mitigation') || normalizedName.includes('mitigation');
  const isClimateAdaptation = iatiCode === '7' || normalizedName.includes('climate adaptation') || (normalizedName.includes('adaptation') && normalizedName.includes('climate'));
  const isBiodiversity = iatiCode === '5' || normalizedName.includes('biodiversity');
  const isDesertification = iatiCode === '8' || normalizedName.includes('desertification');
  const isDisability = iatiCode === '11' || normalizedName.includes('disability');
  const isDisasterRiskReduction = iatiCode === '10' || normalizedName.includes('disaster') || normalizedName.includes('sendai');
  const isPeaceSecurity = iatiCode === '3' || normalizedName.includes('peace') || normalizedName.includes('conflict') || normalizedName.includes('security');
  const isGender = iatiCode === '1' || normalizedName.includes('gender') || normalizedName.includes('women');

  // Get explanation based on marker type and significance
  if (isNutrition) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to improve nutrition outcomes. Any effects on nutrition are unintended or secondary.";
      case 1: return "Improving nutrition is an explicit objective, but not the principal purpose of the activity. The activity includes nutrition-specific or nutrition-sensitive components alongside other objectives.";
      case 2: return "Improving nutrition outcomes is the main purpose of the activity. The activity is fundamentally designed to prevent or address malnutrition in all its forms.";
      default: return "";
    }
  }

  if (isEnvironment) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to protect or improve the environment. Environmental considerations are not a stated objective.";
      case 1: return "Environmental protection is an explicit objective, but not the main purpose of the activity. The activity includes measures to mitigate environmental harm or promote sustainability.";
      case 2: return "Environmental protection or improvement is the primary purpose of the activity. The activity is designed specifically to achieve environmental outcomes.";
      default: return "";
    }
  }

  if (isClimateMitigation) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to reduce or limit greenhouse gas emissions. Any mitigation effects are incidental.";
      case 1: return "Climate change mitigation is an explicit objective, but not the primary purpose of the activity. The activity includes components that contribute to emissions reduction alongside other goals.";
      case 2: return "Reducing or limiting greenhouse gas emissions is the main purpose of the activity. The activity is specifically designed as a climate mitigation intervention.";
      default: return "";
    }
  }

  if (isClimateAdaptation) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to reduce vulnerability to climate change. Any resilience benefits are incidental.";
      case 1: return "Climate change adaptation is an explicit objective, but not the principal purpose. The activity includes measures to enhance resilience to climate impacts alongside other objectives.";
      case 2: return "Reducing vulnerability to climate change is the main purpose of the activity. The activity is specifically designed to address climate risks and impacts.";
      default: return "";
    }
  }

  if (isBiodiversity) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to conserve or sustainably use biodiversity. Any biodiversity effects are incidental.";
      case 1: return "Biodiversity conservation is an explicit objective, but not the primary purpose. The activity includes biodiversity-related measures alongside other objectives.";
      case 2: return "Conserving or sustainably using biodiversity is the main purpose of the activity. The activity is fundamentally designed to deliver biodiversity outcomes.";
      default: return "";
    }
  }

  if (isDesertification) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to combat desertification or land degradation. Any related impacts are incidental.";
      case 1: return "Combating desertification or land degradation is an explicit objective, but not the main purpose. The activity includes relevant measures alongside other development objectives.";
      case 2: return "Combating desertification or land degradation is the main purpose of the activity. The activity is specifically designed to address these challenges.";
      default: return "";
    }
  }

  if (isDisability) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to promote the inclusion or rights of persons with disabilities. Disability inclusion is not an explicit objective.";
      case 1: return "Disability inclusion is an explicit and deliberate objective, but not the primary purpose. The activity includes targeted measures to reduce barriers for persons with disabilities.";
      case 2: return "Promoting the inclusion and rights of persons with disabilities is the main purpose of the activity. The activity is designed primarily to address disability-related exclusion.";
      default: return "";
    }
  }

  if (isDisasterRiskReduction) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to reduce disaster risk or vulnerability. Any disaster-related effects are incidental.";
      case 1: return "Disaster risk reduction is an explicit objective, but not the primary purpose. The activity includes measures to prevent, reduce, or manage disaster risks alongside other goals.";
      case 2: return "Reducing disaster risk and vulnerability is the main purpose of the activity. The activity is designed specifically to deliver disaster risk reduction outcomes.";
      default: return "";
    }
  }

  if (isPeaceSecurity) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to promote peace, prevent conflict, or improve security. Any effects in this area are incidental.";
      case 1: return "Peace, conflict prevention, or security is an explicit objective, but not the main purpose. The activity includes components that address conflict drivers or support stability.";
      case 2: return "Promoting peace, preventing conflict, or improving security is the main purpose of the activity. The activity is specifically designed to address conflict or insecurity.";
      default: return "";
    }
  }

  if (isGender) {
    switch (significance) {
      case 0: return "The activity does not deliberately aim to advance gender equality or women's empowerment. Gender equality is neither an explicit objective nor reflected in the design or results framework.";
      case 1: return "Gender equality is an explicit and deliberate objective, but not the principal reason for the activity. The activity includes specific actions to reduce gender inequalities alongside other primary objectives.";
      case 2: return "Advancing gender equality and women's empowerment is the main purpose of the activity. The activity is designed primarily to address gender-based inequalities and would not exist without this objective.";
      default: return "";
    }
  }

  // Default explanations for other markers
  switch (significance) {
    case 0: return "The activity does not deliberately aim to address this policy marker. Any related effects are incidental.";
    case 1: return "This policy marker is an explicit objective, but not the principal purpose of the activity. The activity includes relevant components alongside other objectives.";
    case 2: return "This policy marker is the main purpose of the activity. The activity is fundamentally designed to deliver outcomes in this area.";
    default: return "";
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
                    <TableRow key={marker.policy_marker_id} className="hover:bg-muted/50">
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help text-slate-900">
                                {getSignificanceLabel(marker.significance)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p className="text-sm">
                                {getSignificanceExplanation(
                                  marker.policy_marker_details?.iati_code,
                                  marker.policy_marker_details?.name,
                                  marker.significance
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
