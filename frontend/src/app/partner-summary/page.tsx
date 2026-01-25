"use client"

import React, { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Building2, 
  Users, 
  DollarSign, 
  Calendar, 
  Download, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Filter,
  BarChart3,
  ExternalLink,
  ExpandIcon,
  Minimize2,
  Maximize2,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Settings,
  Plus,
  ToggleLeft,
  ToggleRight
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"

// Enhanced interfaces matching the API
interface PartnerSummaryData {
  id: string;
  name: string;
  acronym?: string;
  displayName: string;
  organizationType: string;
  organizationTypeId: string;
  organizationTypeLabel: string;
  organizationTypeCode: string;
  userDefinedGroups: UserDefinedGroup[];
  projectCounts: {
    active: number;
    total: number;
  };
  financialData: {
    year2022: number;
    year2023: number;
    year2024: number;
    year2025: number;
    year2026: number;
    year2027: number;
  };
  lastUpdated: string;
  website?: string;
  contactEmail?: string;
  country?: string;
  fullName?: string;
}

interface UserDefinedGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdByName?: string;
  lastUpdated: string;
  memberCount: number;
}

interface OrganizationTypeGroup {
  id: string;
  code: string;
  type: string;
  label: string;
  count: number;
  totalProjects: number;
  totalDisbursements: number;
  yearlyTotals: {
    year2022: number;
    year2023: number;
    year2024: number;
    year2025: number;
    year2026: number;
    year2027: number;
  };
}

interface PartnerSummaryResponse {
  partners: PartnerSummaryData[];
  organizationTypeGroups: OrganizationTypeGroup[];
  userDefinedGroups: UserDefinedGroup[];
  organizationTypes: string[];
  lastUpdated: string;
  groupingMode: 'organizationType' | 'userDefined';
  totalCounts: {
    partners: number;
    projects: number;
    totalDisbursements: number;
  };
}

// Sorting options
type SortField = 'name' | 'projects' | 'year2022' | 'year2023' | 'year2024' | 'year2025' | 'year2026' | 'year2027';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function PartnerSummaryPage() {
  const [data, setData] = useState<PartnerSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering and grouping
  const [groupingMode, setGroupingMode] = useState<'organizationType' | 'userDefined'>('organizationType');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  
  // Collapse/Expand all functionality
  const [allCollapsed, setAllCollapsed] = useState(false);
  
  // Financial data toggle - Disbursements vs Commitments
  const [financialMode, setFinancialMode] = useState<'disbursements' | 'commitments'>('disbursements');
  
  // Create Group Modal state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchPartnerSummary();
  }, [groupingMode, financialMode]);

  const fetchPartnerSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/partner-summary?groupBy=${groupingMode}&financialMode=${financialMode}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch partner summary: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      
      // Auto-expand first 3 groups
      if (result.organizationTypeGroups?.length > 0 || result.userDefinedGroups?.length > 0) {
        const groupsToExpand = groupingMode === 'organizationType' 
          ? result.organizationTypeGroups.slice(0, 3).map((g: OrganizationTypeGroup) => g.code)
          : result.userDefinedGroups.slice(0, 3).map((g: UserDefinedGroup) => g.id);
        setExpandedGroups(new Set(groupsToExpand));
      }
      
    } catch (err) {
      console.error('Error fetching partner summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to load partner summary');
      toast.error('Failed to load partner summary data');
    } finally {
      setLoading(false);
    }
  };

  // Filter partners based on search and selected types
  const filteredPartners = useMemo(() => {
    if (!data) return [];
    
    let filtered = data.partners;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(partner => 
        partner.name.toLowerCase().includes(term) ||
        partner.fullName?.toLowerCase().includes(term) ||
        partner.acronym?.toLowerCase().includes(term) ||
        partner.organizationTypeLabel.toLowerCase().includes(term) ||
        partner.country?.toLowerCase().includes(term)
      );
    }
    
    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(partner => 
        selectedTypes.includes(partner.organizationType)
      );
    }
    
    return filtered;
  }, [data, searchTerm, selectedTypes]);

  // Group partners by current grouping mode
  const groupedPartners = useMemo(() => {
    if (!data || !filteredPartners.length) return new Map();
    
    const groups = new Map<string, { 
      info: OrganizationTypeGroup | UserDefinedGroup; 
      partners: PartnerSummaryData[] 
    }>();
    
    if (groupingMode === 'organizationType') {
      // Group by organization type
      data.organizationTypeGroups.forEach(typeGroup => {
        const groupPartners = filteredPartners.filter(p => p.organizationTypeCode === typeGroup.code);
        if (groupPartners.length > 0) {
          groups.set(typeGroup.code, { info: typeGroup, partners: groupPartners });
        }
      });
    } else {
      // Group by user-defined groups
      data.userDefinedGroups.forEach(userGroup => {
        const groupPartners = filteredPartners.filter(p => 
          p.userDefinedGroups.some(g => g.id === userGroup.id)
        );
        if (groupPartners.length > 0) {
          groups.set(userGroup.id, { info: userGroup, partners: groupPartners });
        }
      });
      
      // Add ungrouped partners
      const ungroupedPartners = filteredPartners.filter(p => p.userDefinedGroups.length === 0);
      if (ungroupedPartners.length > 0) {
        groups.set('ungrouped', { 
          info: { 
            id: 'ungrouped', 
            name: 'Ungrouped Organizations', 
            description: 'Organizations not assigned to any group',
            createdBy: '',
            lastUpdated: '',
            memberCount: ungroupedPartners.length
          } as UserDefinedGroup, 
          partners: ungroupedPartners 
        });
      }
    }
    
    return groups;
  }, [data, filteredPartners, groupingMode]);

  // Sort partners within groups
  const sortPartners = (partners: PartnerSummaryData[]) => {
    return [...partners].sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'projects':
          comparison = a.projectCounts.active - b.projectCounts.active;
          break;
        case 'year2022':
          comparison = a.financialData.year2022 - b.financialData.year2022;
          break;
        case 'year2023':
          comparison = a.financialData.year2023 - b.financialData.year2023;
          break;
        case 'year2024':
          comparison = a.financialData.year2024 - b.financialData.year2024;
          break;
        case 'year2025':
          comparison = a.financialData.year2025 - b.financialData.year2025;
          break;
        case 'year2026':
          comparison = a.financialData.year2026 - b.financialData.year2026;
          break;
        case 'year2027':
          comparison = a.financialData.year2027 - b.financialData.year2027;
          break;
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Expand/Collapse all groups
  const toggleAllGroups = () => {
    if (allCollapsed) {
      setExpandedGroups(new Set(Array.from(groupedPartners.keys())));
    } else {
      setExpandedGroups(new Set());
    }
    setAllCollapsed(!allCollapsed);
  };

  // Sort functionality
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-gray-400" /> : 
      <ArrowDown className="h-4 w-4 text-gray-400" />;
  };

  // Format currency with thousands separators
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '-';
    return `$${amount.toLocaleString()}`;
  };

  // Create new group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      setCreatingGroup(true);

      const response = await fetch('/api/organization-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          organizationIds: selectedOrganizations,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const result = await response.json();
      
      toast.success('Group created successfully');
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedOrganizations([]);
      
      // Refresh data
      fetchPartnerSummary();

    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Export functionality
  const handleExport = () => {
    if (!data) return;
    
    const csvData = [
      ['Organisation Name', 'Organization Type', 'Active Projects', `2022 (USD) - ${financialMode}`, `2023 - ${financialMode}`, `2024 - ${financialMode}`, `2025 - ${financialMode}`, `2026 - ${financialMode}`, `2027 - ${financialMode}`],
      ...filteredPartners.map(partner => [
        partner.fullName && partner.acronym ? `${partner.fullName} (${partner.acronym})` : partner.name,
        partner.organizationTypeLabel,
        partner.projectCounts.active.toString(),
        partner.financialData.year2022.toString(),
        partner.financialData.year2023.toString(),
        partner.financialData.year2024.toString(),
        partner.financialData.year2025.toString(),
        partner.financialData.year2026.toString(),
        partner.financialData.year2027.toString()
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-summary-${financialMode}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Partner summary exported successfully');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading partner summary...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Partner Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={fetchPartnerSummary} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!data) return null;

  const totalPartners = data.totalCounts.partners;
  const totalProjects = data.totalCounts.projects;
  const totalDisbursements = data.totalCounts.totalDisbursements;
  const visibleGroupsCount = Array.from(groupedPartners.keys()).length;

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Partner Organizations</h1>
            <p className="text-muted-foreground">
              Browse and explore our development partner network
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export All Partners
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Development Partners</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPartners}</div>
              <p className="text-xs text-muted-foreground">
                {filteredPartners.length} shown
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partner Government Entities</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.partners.filter(p => p.organizationTypeCode === '10').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Government partners
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {visibleGroupsCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Groups with organizations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(new Date(data.lastUpdated), 'MMM d')}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(data.lastUpdated), 'yyyy')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Grouping Mode Tabs */}
          <Tabs value={groupingMode} onValueChange={(value: string) => setGroupingMode(value as 'organizationType' | 'userDefined')}>
            <TabsList className="grid w-full lg:w-fit grid-cols-2">
              <TabsTrigger value="organizationType" className="text-sm">
                🏷️ Organization Type
              </TabsTrigger>
              <TabsTrigger value="userDefined" className="text-sm">
                👤 Organization Groups
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1 flex flex-wrap gap-2 min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Financial Mode Toggle */}
            <div className="flex items-center space-x-2 bg-muted rounded-lg p-1 flex-shrink-0">
              <Button
                variant={financialMode === 'disbursements' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFinancialMode('disbursements')}
                className="text-xs whitespace-nowrap"
              >
                Disbursements
              </Button>
              <Button
                variant={financialMode === 'commitments' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFinancialMode('commitments')}
                className="text-xs whitespace-nowrap"
              >
                Commitments
              </Button>
            </div>

            {/* Global expand/collapse controls */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={toggleAllGroups} className="whitespace-nowrap">
                {allCollapsed ? <Maximize2 className="h-4 w-4 mr-2 flex-shrink-0" /> : <Minimize2 className="h-4 w-4 mr-2 flex-shrink-0" />}
                {allCollapsed ? 'Expand All' : 'Collapse All'}
              </Button>
              <Button size="sm" onClick={() => setShowCreateGroupModal(true)} className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                Create Group
              </Button>
            </div>
          </div>
        </div>

        {/* Grouped Partner Data */}
        <div className="space-y-4">
          {Array.from(groupedPartners.entries()).map(([groupId, { info, partners }]) => {
            const isExpanded = expandedGroups.has(groupId);
            const sortedPartners = sortPartners(partners);

            return (
              <Card key={groupId}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleGroup(groupId)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors py-3">
                      <div className="flex items-center justify-between gap-4 min-w-0">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {isExpanded ? 
                            <ChevronDown className="h-5 w-5 flex-shrink-0" /> : 
                            <ChevronRight className="h-5 w-5 flex-shrink-0" />
                          }
                          <div className="min-w-0">
                            <CardTitle className="text-lg truncate">
                              {'label' in info ? info.label : info.name}
                            </CardTitle>
                            <CardDescription className="truncate">
                              {partners.length === 0 ? 'No organisations assigned to this group yet' : `${partners.length} organizations`}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground flex-shrink-0">
                          <div className="flex items-center whitespace-nowrap">
                            <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                            {partners.length} organizations
                          </div>
                          {groupingMode === 'userDefined' && (
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View in Groups Manager
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {partners.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                          <p>No organisations assigned to this group yet</p>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background">
                              <TableRow>
                                <TableHead className="w-[300px]">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('name')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    Organisation Name
                                    {getSortIcon('name')}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-center">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('projects')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    Active Projects
                                    {getSortIcon('projects')}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('year2022')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    2022 (USD)
                                    {getSortIcon('year2022')}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('year2023')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    2023
                                    {getSortIcon('year2023')}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('year2024')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    2024
                                    {getSortIcon('year2024')}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('year2025')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    2025
                                    {getSortIcon('year2025')}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('year2026')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    2026
                                    {getSortIcon('year2026')}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSort('year2027')}
                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                  >
                                    2027
                                    {getSortIcon('year2027')}
                                  </Button>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedPartners.map(partner => (
                                <TableRow key={partner.id} className="h-[40px]">
                                  <TableCell className="py-0.5">
                                    <Link 
                                      href={`/partners/${partner.id}`}
                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {partner.fullName && partner.acronym 
                                        ? `${partner.fullName} (${partner.acronym})`
                                        : partner.displayName
                                      }
                                    </Link>
                                  </TableCell>
                                  <TableCell className="text-center py-0.5">
                                    <div className="font-medium">{partner.projectCounts.active}</div>
                                  </TableCell>
                                  <TableCell className="text-right py-0.5">
                                    <div className="font-medium">
                                      {formatCurrency(partner.financialData.year2022)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-0.5">
                                    <div className="font-medium">
                                      {formatCurrency(partner.financialData.year2023)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-0.5">
                                    <div className="font-medium">
                                      {formatCurrency(partner.financialData.year2024)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-0.5">
                                    <div className="font-medium">
                                      {formatCurrency(partner.financialData.year2025)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-0.5">
                                    <div className="font-medium">
                                      {formatCurrency(partner.financialData.year2026)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-0.5">
                                    <div className="font-medium">
                                      {formatCurrency(partner.financialData.year2027)}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}

          {groupedPartners.size === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No partners found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setSelectedTypes([]);
                }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Group Modal */}
        <Dialog open={showCreateGroupModal} onOpenChange={setShowCreateGroupModal}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Create Organization Group</DialogTitle>
              <DialogDescription>
                Create a new group and assign organizations to it
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="groupDescription">Description</Label>
                <Textarea
                  id="groupDescription"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Enter group description..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Assign Organizations</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {data?.partners.map((partner) => (
                      <div key={partner.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={partner.id}
                          checked={selectedOrganizations.includes(partner.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOrganizations(prev => [...prev, partner.id]);
                            } else {
                              setSelectedOrganizations(prev => prev.filter(id => id !== partner.id));
                            }
                          }}
                        />
                        <label htmlFor={partner.id} className="text-sm cursor-pointer flex-1">
                          {partner.fullName && partner.acronym 
                            ? `${partner.fullName} (${partner.acronym})`
                            : partner.displayName
                          }
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedOrganizations.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedOrganizations.length} organization{selectedOrganizations.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateGroupModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGroup} 
                disabled={!newGroupName.trim() || creatingGroup}
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </TooltipProvider>
    </MainLayout>
  );
} 