"use client"

import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Users, 
  Search, 
  DollarSign,
  Activity,
  ExternalLink,
  Loader2,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  FolderOpen,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PartnerFundingSummarySkeleton } from "@/components/skeletons";

type SortField = 'name' | 'activeProjects' | 'totalAmount' | '2022' | '2023' | '2024' | '2025' | '2026' | '2027';
type SortOrder = 'asc' | 'desc';

interface OrganizationMetrics {
  id: string;
  name: string;
  fullName: string;
  acronym: string;
  type?: string;
  organisationType: string;
  countryRepresented: string;
  activeProjects: number;
  totalAmount: number;
  financialData: Record<string, number>;
  website?: string;
  logo?: string;
  cooperationModality?: string;  // Partner Origin
  derivedCategory?: string;       // Partner Classification
}

interface GroupData {
  id: string;
  name: string;
  description: string;
  type: 'predefined' | 'custom';
  organizations: OrganizationMetrics[];
  totalOrganizations: number;
  totalAmount: number;
  totalActiveProjects: number;
}

interface SummaryData {
  groups: GroupData[];
  totalOrganizations: number;
  totalActiveProjects: number;
  totalAmount: number;
  lastUpdated: string;
  transactionType: string;
  groupBy: string;
}

export default function PartnersPage() {
  const router = useRouter();
  const { user } = useUser();
  
  // Main state
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionType, setTransactionType] = useState<'C' | 'D'>('C'); // C = Commitments, D = Disbursements
  const [groupBy, setGroupBy] = useState<'type' | 'custom'>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationMetrics | null>(null);

  // Fetch summary data
  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/partners/summary?groupBy=${groupBy}&transactionType=${transactionType}`,
        { cache: 'no-store' }
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setSummaryData(data);
      
      // Auto-expand all groups initially
      if (data.groups) {
        setExpandedGroups(new Set(data.groups.map((g: GroupData) => g.id)));
      }
    } catch (err) {
      console.error('Error fetching summary data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [transactionType, groupBy]);

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

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Sort organizations within a group
  const sortOrganizations = (organizations: OrganizationMetrics[]) => {
    return [...organizations].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'activeProjects':
          aVal = a.activeProjects || 0;
          bVal = b.activeProjects || 0;
          break;
        case 'totalAmount':
          aVal = a.totalAmount;
          bVal = b.totalAmount;
          break;
        case '2022':
        case '2023':
        case '2024':
        case '2025':
        case '2026':
        case '2027':
          aVal = a.financialData[sortField] || 0;
          bVal = b.financialData[sortField] || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filter organizations by search term
  const filterOrganizations = (organizations: OrganizationMetrics[]) => {
    if (!searchTerm) return organizations;
    
    const term = searchTerm.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(term) ||
      org.fullName.toLowerCase().includes(term) ||
      org.acronym.toLowerCase().includes(term) ||
      org.countryRepresented.toLowerCase().includes(term)
    );
  };

  // Calculate metrics
  const bilateralPartnersCount = useMemo(() => {
    if (!summaryData) return 0;
    return summaryData.groups
      .filter(g => g.id === 'bilateral')
      .reduce((sum, g) => sum + g.totalOrganizations, 0);
  }, [summaryData]);

  const multilateralPartnersCount = useMemo(() => {
    if (!summaryData) return 0;
    return summaryData.groups
      .filter(g => g.id === 'multilateral')
      .reduce((sum, g) => sum + g.totalOrganizations, 0);
  }, [summaryData]);

  const otherPartnersCount = useMemo(() => {
    if (!summaryData) return 0;
    return summaryData.groups
      .filter(g => g.id === 'other')
      .reduce((sum, g) => sum + g.totalOrganizations, 0);
  }, [summaryData]);

  const activeGroupsCount = useMemo(() => {
    if (!summaryData) return 0;
    return summaryData.groups.filter(g => g.totalOrganizations > 0).length;
  }, [summaryData]);

  // Export to CSV
  const exportToCSV = () => {
    if (!summaryData) return;
    
    const allOrganizations = summaryData.groups.flatMap(group => 
      group.organizations.map(org => ({
        'Group': group.name,
        'Organization Name': org.name,
        'Full Name': org.fullName,
        'Acronym': org.acronym,
        'Type': org.organisationType,
        'Country': org.countryRepresented,
        'Active Projects': org.activeProjects,
        'Total Amount': org.totalAmount,
        '2022': org.financialData['2022'] || 0,
        '2023': org.financialData['2023'] || 0,
        '2024': org.financialData['2024'] || 0,
        '2025': org.financialData['2025'] || 0,
        '2026': org.financialData['2026'] || 0,
        '2027': org.financialData['2027'] || 0
      }))
    );

    const headers = Object.keys(allOrganizations[0] || {});
    const csv = [
      headers.join(","),
      ...allOrganizations.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === "string" && value.includes(",") 
            ? `"${value}"` 
            : value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partner-summary-${transactionType === 'C' ? 'commitments' : 'disbursements'}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  // Format currency
  const formatCurrency = (amount: number | null | undefined): string => {
    // Handle null, undefined, or non-numeric values
    if (amount === null || amount === undefined || typeof amount !== 'number' || isNaN(amount)) {
      return "-";
    }
    
    if (amount === 0) return "-";
    if (Math.abs(amount) >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    
    try {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } catch {
      return `$${amount}`;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <PartnerFundingSummarySkeleton />
      </MainLayout>
    );
  }

  if (error || !summaryData) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Failed to load data'}</p>
            <Button onClick={fetchSummaryData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Partner Summary</h1>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-700">Bilateral Partners</CardTitle>
                  <Building2 className="h-4 w-4 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{bilateralPartnersCount}</div>
                <p className="text-xs text-gray-500 mt-1">{bilateralPartnersCount} shown</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-700">Multilateral Organisations</CardTitle>
                  <Users className="h-4 w-4 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{multilateralPartnersCount}</div>
                <p className="text-xs text-gray-500 mt-1">Multilateral organisations</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-700">Other Partners</CardTitle>
                  <Users className="h-4 w-4 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{otherPartnersCount}</div>
                <p className="text-xs text-gray-500 mt-1">Other partners</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-700">Groups with organizations</CardTitle>
                  <FolderOpen className="h-4 w-4 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{activeGroupsCount}</div>
                <p className="text-xs text-gray-500 mt-1">Groups with organizations</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={groupBy} onValueChange={(value) => setGroupBy(value as 'type' | 'custom')}>
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-auto grid-cols-2">
                <TabsTrigger value="type" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organization Type
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Organization Groups
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, acronym, count..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                {/* Transaction Type Toggle */}
                <div className="flex items-center bg-white border border-gray-200 rounded-md">
                  <Button
                    variant={transactionType === 'D' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTransactionType('D')}
                    className="rounded-r-none"
                  >
                    Disbursements
                  </Button>
                  <Button
                    variant={transactionType === 'C' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTransactionType('C')}
                    className="rounded-l-none"
                  >
                    Commitments
                  </Button>
                </div>

                {/* Actions */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const allGroupIds = summaryData.groups.map(g => g.id);
                    setExpandedGroups(new Set(allGroupIds));
                  }}
                >
                  Expand All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setExpandedGroups(new Set())}
                >
                  Collapse All
                </Button>
              </div>
            </div>

            <TabsContent value="type">
              <div className="space-y-4">
                {summaryData.groups.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const filteredOrgs = filterOrganizations(group.organizations);
                  const sortedOrgs = sortOrganizations(filteredOrgs);

                  return (
                    <Card key={group.id} className="bg-white border border-gray-200">
                      <CardHeader 
                        className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                            <div>
                              <CardTitle className="text-lg font-semibold text-gray-900">
                                {group.name}
                              </CardTitle>
                              <CardDescription className="text-gray-600">
                                {group.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="text-sm">
                              {group.totalOrganizations} organizations
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0">
                          {sortedOrgs.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              {searchTerm ? 'No organizations match your search' : 'No organizations in this group'}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('name')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        Organisation Name
                                        {getSortIcon('name')}
                                      </button>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('activeProjects')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        Active Projects
                                        {getSortIcon('activeProjects')}
                                      </button>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('2022')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        2022 (USD)
                                        {getSortIcon('2022')}
                                      </button>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('2023')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        2023 (USD)
                                        {getSortIcon('2023')}
                                      </button>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('2024')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        2024 (USD)
                                        {getSortIcon('2024')}
                                      </button>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('2025')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        2025 (USD)
                                        {getSortIcon('2025')}
                                      </button>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('2026')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        2026 (USD)
                                        {getSortIcon('2026')}
                                      </button>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700">
                                      <button
                                        onClick={() => handleSort('2027')}
                                        className="flex items-center hover:text-gray-900"
                                      >
                                        2027 (USD)
                                        {getSortIcon('2027')}
                                      </button>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedOrgs.map((org) => (
                                    <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="py-3 px-2">
                                        <button
                                          onClick={() => router.push(`/organizations/${org.id}`)}
                                          className="text-left text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          {org.fullName && org.acronym 
                                            ? `${org.fullName} (${org.acronym})`
                                            : org.name
                                          }
                                        </button>
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        {org.activeProjects || 0}
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        {formatCurrency(org.financialData['2022'])}
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        {formatCurrency(org.financialData['2023'])}
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        {formatCurrency(org.financialData['2024'])}
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        {formatCurrency(org.financialData['2025'])}
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        {formatCurrency(org.financialData['2026'])}
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        {formatCurrency(org.financialData['2027'])}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="custom">
              <div className="space-y-4">
                {summaryData.groups.length === 0 ? (
                  <Card className="bg-white border border-gray-200">
                    <CardContent className="py-12 text-center">
                      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Groups</h3>
                      <p className="text-gray-600 mb-4">
                        Create custom organization groups to organize partners by your own criteria.
                      </p>
                      <Button onClick={() => router.push('/partners/groups')}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Manage Groups
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  summaryData.groups.filter(g => g.type === 'custom').map((group) => {
                    const isExpanded = expandedGroups.has(group.id);
                    const filteredOrgs = filterOrganizations(group.organizations);
                    const sortedOrgs = sortOrganizations(filteredOrgs);

                    return (
                      <Card key={group.id} className="bg-white border border-gray-200">
                        <CardHeader 
                          className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div className="flex items-center justify-between">
                                                         <div className="flex items-center gap-3">
                               {isExpanded ? (
                                 <ChevronUp className="h-4 w-4 text-gray-400" />
                               ) : (
                                 <ChevronDown className="h-4 w-4 text-gray-400" />
                               )}
                               <FolderOpen className="h-5 w-5 text-blue-600" />
                              <div>
                                <CardTitle className="text-lg font-semibold text-gray-900">
                                  {group.name}
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                  {group.description}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="secondary" className="text-sm">
                                {group.totalOrganizations} organizations
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="pt-0">
                            {sortedOrgs.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                {searchTerm ? 'No organizations match your search' : 'No organizations in this group'}
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('name')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          Organisation Name
                                          {getSortIcon('name')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('activeProjects')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          Active Projects
                                          {getSortIcon('activeProjects')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('2022')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          2022 (USD)
                                          {getSortIcon('2022')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('2023')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          2023 (USD)
                                          {getSortIcon('2023')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('2024')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          2024 (USD)
                                          {getSortIcon('2024')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('2025')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          2025 (USD)
                                          {getSortIcon('2025')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('2026')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          2026 (USD)
                                          {getSortIcon('2026')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-gray-700">
                                        <button
                                          onClick={() => handleSort('2027')}
                                          className="flex items-center hover:text-gray-900"
                                        >
                                          2027 (USD)
                                          {getSortIcon('2027')}
                                        </button>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedOrgs.map((org) => (
                                      <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-2">
                                          <button
                                            onClick={() => router.push(`/organizations/${org.id}`)}
                                            className="text-left text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                            {org.fullName && org.acronym 
                                              ? `${org.fullName} (${org.acronym})`
                                              : org.name
                                            }
                                          </button>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {org.activeProjects || 0}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {formatCurrency(org.financialData['2022'])}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {formatCurrency(org.financialData['2023'])}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {formatCurrency(org.financialData['2024'])}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {formatCurrency(org.financialData['2025'])}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {formatCurrency(org.financialData['2026'])}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {formatCurrency(org.financialData['2027'])}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Organization Detail Dialog */}
      <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedOrg?.logo ? (
                <img 
                  src={selectedOrg.logo} 
                  alt={selectedOrg.name}
                  className="h-10 w-10 object-contain rounded"
                />
              ) : (
                <Building2 className="h-10 w-10 text-slate-400" />
              )}
              <div>
                <div className="font-semibold">{selectedOrg?.name}</div>
                <div className="text-sm text-slate-500 font-normal">{selectedOrg?.fullName}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrg && (
            <div className="space-y-6">
              {/* Organization Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Acronym</label>
                  <p className="text-slate-900">{selectedOrg.acronym || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <p className="text-slate-900">{selectedOrg.organisationType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Country</label>
                  <p className="text-slate-900">{selectedOrg.countryRepresented || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Active Projects</label>
                  <p className="text-slate-900">{selectedOrg.activeProjects}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">
                  Financial Summary ({transactionType === 'C' ? 'Commitments' : 'Disbursements'})
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[2022, 2023, 2024, 2025, 2026, 2027].map(year => (
                    <div key={year} className="text-center p-3 bg-slate-50 rounded">
                      <div className="text-sm text-slate-600">{year}</div>
                      <div className="font-mono font-medium">
                        {formatCurrency(selectedOrg.financialData[year.toString()] || 0)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700">Total:</span>
                    <span className="font-mono font-bold text-lg">
                      {formatCurrency(selectedOrg.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-slate-200">
                <div className="flex gap-2">
                  {selectedOrg.website && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(selectedOrg.website, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                </div>
                <Button onClick={() => router.push(`/organizations/${selectedOrg.id}`)}>
                  View Full Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
} 