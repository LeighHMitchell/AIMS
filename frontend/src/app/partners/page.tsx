"use client"

import React, { useState, useEffect, useMemo } from "react";
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
  Search,
  DollarSign,
  Activity,
  ExternalLink,
  Loader2,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
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
  ArrowDown,
  Globe,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PartnerFundingSummarySkeleton } from "@/components/skeletons";
import { OrganizationLogo } from "@/components/ui/organization-logo";
import { INSTITUTIONAL_GROUPS, getAllInstitutionalGroupNames } from "@/data/location-groups";
import { apiFetch } from '@/lib/api-fetch';

type SortField = 'name' | 'reportedActivities' | 'providerReceiver' | 'totalAmount' | '2022' | '2023' | '2024' | '2025' | '2026' | '2027';
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
  // Activity breakdown
  reportedActivities?: number;      // Activities where org is reporting_org_id
  providerTransactionCount?: number; // Transactions where org is provider
  receiverTransactionCount?: number; // Transactions where org is receiver
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
  logo?: string;
}

interface SummaryData {
  predefinedGroups: GroupData[];
  customGroups: GroupData[];
  countryGroups: GroupData[];
  totalOrganizations: number;
  totalActiveProjects: number;
  totalAmount: number;
  customGroupsCount: number;
  lastUpdated: string;
}

export default function PartnersPage() {
  const router = useRouter();
  const { user } = useUser();
  
  // Current year for determining actual vs planned disbursements
  const currentYear = new Date().getFullYear();
  
  // Helper to get column label with actual/planned indicator
  const getYearLabel = (year: number) => {
    if (year <= currentYear) {
      return `${year} (Actual)`;
    }
    return `${year} (Planned)`;
  };
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("");

  // Main state - unified view showing actual disbursements + planned disbursements
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groupBy, setGroupBy] = useState<'type' | 'custom'>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationMetrics | null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [orgActivities, setOrgActivities] = useState<Record<string, any[]>>({});
  const [loadingOrgs, setLoadingOrgs] = useState<Set<string>>(new Set());
  const [loadingCountries, setLoadingCountries] = useState<Set<string>>(new Set());
  const [expandLevel, setExpandLevel] = useState<0 | 1 | 2>(0); // 0 = collapsed, 1 = orgs expanded, 2 = activities expanded
  const [hideInactiveOrgs, setHideInactiveOrgs] = useState(false); // Hide orgs with no financial activity
  const transactionType = 'D'; // Disbursements - matches the summary data shown

  // Fetch summary data - unified view with actual disbursements + planned disbursements
  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const timestamp = Date.now();
      const [predefinedResponse, customResponse] = await Promise.all([
        apiFetch(`/api/partners/summary?groupBy=country&_t=${timestamp}`, { cache: 'no-store' }),
        apiFetch(`/api/partners/summary?groupBy=custom&_t=${timestamp}`, { cache: 'no-store' })
      ]);

      if (!predefinedResponse.ok || !customResponse.ok) {
        throw new Error(`API Error: ${predefinedResponse.status} or ${customResponse.status}`);
      }

      const [predefinedData, customData] = await Promise.all([
        predefinedResponse.json(),
        customResponse.json()
      ]);

      const data: SummaryData = {
        predefinedGroups: predefinedData.groups || [],
        customGroups: customData.groups || [],
        countryGroups: predefinedData.groups || [],
        totalOrganizations: predefinedData.totalOrganizations || 0,
        totalActiveProjects: predefinedData.totalActiveProjects || 0,
        totalAmount: predefinedData.totalAmount || 0,
        customGroupsCount: customData.customGroupsCount || customData.groups?.length || 0,
        lastUpdated: predefinedData.lastUpdated || new Date().toISOString()
      };

      setSummaryData(data);

      // Auto-expand countries and all organizations with their activities
      if (data.predefinedGroups) {
        const countryIds = data.predefinedGroups.map((g: GroupData) => g.id);
        setExpandedCountries(new Set(countryIds));

        // Collect all org IDs and auto-expand them
        const allOrgs: string[] = [];
        const orgsWithActivities: string[] = [];
        data.predefinedGroups.forEach((group: GroupData) => {
          group.organizations.forEach((org: OrganizationMetrics) => {
            allOrgs.push(org.id);
            if (org.activeProjects && org.activeProjects > 0) {
              orgsWithActivities.push(org.id);
            }
          });
        });

        setExpandedOrgs(new Set(allOrgs));
        setLoadingOrgs(new Set(orgsWithActivities));
        setExpandLevel(2);

        // Fetch activities for all orgs with active projects (batched)
        const batchSize = 5;
        for (let i = 0; i < orgsWithActivities.length; i += batchSize) {
          const batch = orgsWithActivities.slice(i, i + batchSize);
          await Promise.all(batch.map(orgId => fetchOrgActivities(orgId)));
        }
        setLoadingOrgs(new Set());
      }
    } catch (err) {
      console.error('Error fetching summary data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data only once on mount
  useEffect(() => {
    fetchSummaryData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Toggle country expansion
  const toggleCountry = async (countryId: string) => {
    const newExpanded = new Set(expandedCountries);
    if (newExpanded.has(countryId)) {
      newExpanded.delete(countryId);
    } else {
      // Show loading spinner
      setLoadingCountries(prev => new Set([...prev, countryId]));
      newExpanded.add(countryId);
      // Small delay to show spinner (simulates loading)
      await new Promise(resolve => setTimeout(resolve, 150));
      setLoadingCountries(prev => {
        const next = new Set(prev);
        next.delete(countryId);
        return next;
      });
    }
    setExpandedCountries(newExpanded);
  };

  // Toggle organization expansion
  const toggleOrganization = async (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      // Show loading spinner
      setLoadingOrgs(prev => new Set([...prev, orgId]));
      newExpanded.add(orgId);
      // Always fetch activities to ensure we have the latest data for current transaction type
      await fetchOrgActivities(orgId);
      setLoadingOrgs(prev => {
        const next = new Set(prev);
        next.delete(orgId);
        return next;
      });
    }
    setExpandedOrgs(newExpanded);
  };

  // Fetch activities for a specific organization
  const fetchOrgActivities = async (orgId: string) => {
    try {
      const response = await apiFetch(`/api/organizations/${orgId}/activities?transactionType=${transactionType}`);
      if (response.ok) {
        const activities = await response.json();
        setOrgActivities(prev => ({
          ...prev,
          [orgId]: activities
        }));
      } else {
        console.error('Failed to fetch organization activities');
      }
    } catch (error) {
      console.error('Error fetching organization activities:', error);
    }
  };

  // Expand All handler - two levels: first countries/orgs, then activities
  const handleExpandAll = async () => {
    if (!summaryData) return;
    
    if (groupBy === 'type') {
      if (expandLevel === 0) {
        // Level 0 -> 1: Expand all countries
        const countryIds = summaryData.predefinedGroups.map((g: GroupData) => g.id);
        setExpandedCountries(new Set(countryIds));
        setExpandLevel(1);
      } else if (expandLevel === 1) {
        // Level 1 -> 2: Expand all organizations and fetch their activities
        const allOrgs: string[] = [];
        const orgsWithActivities: string[] = [];
        summaryData.predefinedGroups.forEach((group: GroupData) => {
          group.organizations.forEach((org: OrganizationMetrics) => {
            allOrgs.push(org.id);
            // Only track loading for orgs that have active projects
            if (org.activeProjects && org.activeProjects > 0) {
              orgsWithActivities.push(org.id);
            }
          });
        });
        
        // Only set orgs with activities as loading
        setLoadingOrgs(new Set(orgsWithActivities));
        setExpandedOrgs(new Set(allOrgs));
        
        // Fetch activities only for orgs that have active projects (batched)
        const batchSize = 5;
        for (let i = 0; i < orgsWithActivities.length; i += batchSize) {
          const batch = orgsWithActivities.slice(i, i + batchSize);
          await Promise.all(batch.map(orgId => fetchOrgActivities(orgId)));
        }
        
        setLoadingOrgs(new Set());
        setExpandLevel(2);
      }
    } else {
      // For Custom Groups tab
      const customIds = summaryData.customGroups.map((g: GroupData) => g.id);
      setExpandedGroups(new Set(customIds));
    }
  };

  // Collapse All handler - two levels: first activities, then countries/orgs
  const handleCollapseAll = () => {
    if (groupBy === 'type') {
      if (expandLevel === 2) {
        // Level 2 -> 1: Collapse activities only
        setExpandedOrgs(new Set());
        setExpandLevel(1);
      } else {
        // Level 1 or 0 -> 0: Collapse everything
        setExpandedCountries(new Set());
        setExpandedOrgs(new Set());
        setExpandLevel(0);
      }
    } else {
      setExpandedGroups(new Set());
    }
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
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-muted-foreground" />
      : <ArrowDown className="h-3 w-3 ml-1 text-muted-foreground" />;
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
        case 'reportedActivities':
          aVal = a.reportedActivities || 0;
          bVal = b.reportedActivities || 0;
          break;
        case 'providerReceiver':
          aVal = (a.providerTransactionCount || 0) + (a.receiverTransactionCount || 0);
          bVal = (b.providerTransactionCount || 0) + (b.receiverTransactionCount || 0);
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

  // Check if an organization has any financial activity
  const hasFinancialActivity = (org: OrganizationMetrics): boolean => {
    // Check if org has any reported activities or provider/receiver transactions
    if ((org.reportedActivities || 0) > 0) return true;
    if ((org.providerTransactionCount || 0) > 0) return true;
    if ((org.receiverTransactionCount || 0) > 0) return true;
    
    // Check if org has any financial values across years
    const years = ['2022', '2023', '2024', '2025', '2026', '2027'];
    for (const year of years) {
      if ((org.financialData?.[year] || 0) > 0) return true;
    }
    
    return false;
  };

  // Filter organizations by search term and activity status
  const filterOrganizations = (organizations: OrganizationMetrics[]) => {
    let filtered = organizations;
    
    // Filter by activity status if hideInactiveOrgs is enabled
    if (hideInactiveOrgs) {
      filtered = filtered.filter(org => hasFinancialActivity(org));
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(term) ||
        org.fullName.toLowerCase().includes(term) ||
        org.acronym.toLowerCase().includes(term) ||
        org.countryRepresented.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!summaryData) return;
    
    const allGroups = [...summaryData.predefinedGroups, ...summaryData.customGroups];
    const allOrganizations = allGroups.flatMap((group: GroupData) => 
      group.organizations.map((org: OrganizationMetrics) => ({
        'Group': group.name,
        'Organization Name': org.name,
        'Full Name': org.fullName,
        'Acronym': org.acronym,
        'Type': org.organisationType,
        'Country': org.countryRepresented,
        'Activities': org.activeProjects,
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

  // Get all institutional group names for filtering
  const institutionalGroupNames = useMemo(() => getAllInstitutionalGroupNames(), []);

  // Check if a country name is an institutional group
  const isInstitutionalGroupCountry = (countryName: string): boolean => {
    if (!countryName) return false;
    const normalizedName = countryName.toLowerCase().trim();
    // Check if it matches any institutional group name
    if (institutionalGroupNames.some(name => name.toLowerCase() === normalizedName)) {
      return true;
    }
    // Also check for "Global" variations (but not "Unknown" - those go to unassigned)
    if (normalizedName.includes('global')) {
      return true;
    }
    return false;
  };

  // Check if a country name represents unassigned organizations
  const isUnassignedCountry = (countryName: string): boolean => {
    if (!countryName) return true;
    const normalizedName = countryName.toLowerCase().trim();
    return normalizedName === '' || normalizedName === 'unknown' || normalizedName === 'unassigned';
  };

  // Render unified table with countries, organizations, and activities (excluding Global/Regional)
  const renderUnifiedTable = () => {
    if (!summaryData || !summaryData.predefinedGroups) return null;

    const rows: JSX.Element[] = [];

    // Filter out institutional groups and unassigned organizations for separate display
    const bilateralCountries = summaryData.predefinedGroups.filter(
      (country: GroupData) => !isInstitutionalGroupCountry(country.name) && !isUnassignedCountry(country.name)
    );

    bilateralCountries.forEach((country: GroupData) => {
      const isCountryExpanded = expandedCountries.has(country.id);
      const filteredOrgs = filterOrganizations(country.organizations);
      const sortedOrgs = sortOrganizations(filteredOrgs);

      // Skip country if all organizations are filtered out
      if (hideInactiveOrgs && filteredOrgs.length === 0) {
        return;
      }

      // Country row
      rows.push(
        <tr key={country.id} className="border-b border-border hover:bg-muted/50 bg-surface-muted">
          <td className="py-3 px-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCountry(country.id)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title={isCountryExpanded ? "Collapse organizations" : "Expand organizations"}
                disabled={loadingCountries.has(country.id)}
              >
                {loadingCountries.has(country.id) ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : isCountryExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <span className="font-semibold text-foreground">
                {country.name}
              </span>
            </div>
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {country.organizations.reduce((sum, org) => sum + (org.reportedActivities || 0), 0)}
          </td>
          <td className="py-3 px-2 text-center font-semibold text-xs text-gray-700">
            {country.organizations.reduce((sum, org) => sum + (org.providerTransactionCount || 0), 0)}
            {' / '}
            {country.organizations.reduce((sum, org) => sum + (org.receiverTransactionCount || 0), 0)}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(country.organizations.reduce((sum, org) => sum + (org.financialData['2022'] || 0), 0))}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(country.organizations.reduce((sum, org) => sum + (org.financialData['2023'] || 0), 0))}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(country.organizations.reduce((sum, org) => sum + (org.financialData['2024'] || 0), 0))}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(country.organizations.reduce((sum, org) => sum + (org.financialData['2025'] || 0), 0))}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(country.organizations.reduce((sum, org) => sum + (org.financialData['2026'] || 0), 0))}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(country.organizations.reduce((sum, org) => sum + (org.financialData['2027'] || 0), 0))}
          </td>
        </tr>
      );

      // Organization rows (if country is expanded)
      if (isCountryExpanded) {
        sortedOrgs.forEach((org: OrganizationMetrics) => {
          const isOrgExpanded = expandedOrgs.has(org.id);
          const orgActivitiesList = orgActivities[org.id] || [];

          // Organization row
          rows.push(
            <tr key={org.id} className="border-b border-border hover:bg-muted/50 bg-muted">
              <td className="py-3 px-2">
                <div className="flex items-center gap-2 pl-8">
                  <button
                    onClick={() => toggleOrganization(org.id)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={isOrgExpanded ? "Collapse activities" : "Expand activities"}
                    disabled={loadingOrgs.has(org.id)}
                  >
                    {loadingOrgs.has(org.id) ? (
                      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                    ) : isOrgExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <OrganizationLogo logo={org.logo} name={org.name} size="sm" />
                  <a
                    href={`/organizations/${org.id}`}
                    className="text-left text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                  >
                    {org.fullName && org.acronym 
                      ? `${org.fullName} (${org.acronym})`
                      : org.name
                    }
                  </a>
                </div>
              </td>
              <td className="py-3 px-2 text-center font-semibold">
                {org.reportedActivities || 0}
              </td>
              <td className="py-3 px-2 text-center font-semibold text-xs text-gray-700">
                {org.providerTransactionCount || 0} / {org.receiverTransactionCount || 0}
              </td>
              <td className="py-3 px-2 text-center font-semibold">
                {formatCurrency(org.financialData['2022'])}
              </td>
              <td className="py-3 px-2 text-center font-semibold">
                {formatCurrency(org.financialData['2023'])}
              </td>
              <td className="py-3 px-2 text-center font-semibold">
                {formatCurrency(org.financialData['2024'])}
              </td>
              <td className="py-3 px-2 text-center font-semibold">
                {formatCurrency(org.financialData['2025'])}
              </td>
              <td className="py-3 px-2 text-center font-semibold">
                {formatCurrency(org.financialData['2026'])}
              </td>
              <td className="py-3 px-2 text-center font-semibold">
                {formatCurrency(org.financialData['2027'])}
              </td>
            </tr>
          );

          // Activity rows (if organization is expanded)
          if (isOrgExpanded) {
            // Filter activities if hideInactiveOrgs is enabled
            const filteredActivities = hideInactiveOrgs 
              ? orgActivitiesList.filter((activity: any) => {
                  const years = ['2022', '2023', '2024', '2025', '2026', '2027'];
                  return years.some(year => (activity.financialData?.[year] || 0) > 0);
                })
              : orgActivitiesList;

            filteredActivities.forEach((activity: any) => {
              rows.push(
                <tr key={`activity-${activity.id}`} className="hover:bg-muted/50">
                  <td className="py-2 px-2 pl-16">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-px bg-border"></div>
                      {/* Activity Icon */}
                      {activity.icon ? (
                        <div className="w-5 h-5 flex-shrink-0 rounded overflow-hidden border border-border bg-card">
                          <img 
                            src={activity.icon} 
                            alt="" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-5 h-5 flex-shrink-0 bg-muted rounded flex items-center justify-center">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <a
                        href={`/activities/${activity.id}`}
                        className="text-left text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                      >
                        {activity.activity_title || activity.title || 'Untitled Activity'}
                        {activity.acronym && ` (${activity.acronym})`}
                      </a>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    -
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    -
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    {formatCurrency(activity.financialData?.['2022'] || 0)}
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    {formatCurrency(activity.financialData?.['2023'] || 0)}
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    {formatCurrency(activity.financialData?.['2024'] || 0)}
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    {formatCurrency(activity.financialData?.['2025'] || 0)}
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    {formatCurrency(activity.financialData?.['2026'] || 0)}
                  </td>
                  <td className="py-2 px-2 text-center text-sm">
                    {formatCurrency(activity.financialData?.['2027'] || 0)}
                  </td>
                </tr>
              );
            });
          }
        });
      }
    });

    return rows;
  };

  // Get organizations grouped by institutional group for separate display
  const getOrganizationsByInstitutionalGroup = (): { name: string; description: string; organizations: OrganizationMetrics[] }[] => {
    if (!summaryData || !summaryData.predefinedGroups) return [];
    
    // Get all groups that are institutional groups
    const institutionalGroups = summaryData.predefinedGroups.filter(
      (country: GroupData) => isInstitutionalGroupCountry(country.name)
    );
    
    // Map to display format with descriptions from INSTITUTIONAL_GROUPS
    return institutionalGroups.map((group: GroupData) => {
      // Find the matching institutional group definition for description
      const institutionalGroupDef = INSTITUTIONAL_GROUPS.find(
        ig => ig.name.toLowerCase() === group.name.toLowerCase()
      );
      
      return {
        name: group.name,
        description: institutionalGroupDef?.description || `${group.name} organizations`,
        organizations: group.organizations
      };
    }).filter(group => group.organizations.length > 0); // Only show groups with organizations
  };

  // Get Global/Regional organizations for separate display (flattened)
  // This includes all organizations mapped to institutional groups
  const getGlobalOrganizations = () => {
    const groupedOrgs = getOrganizationsByInstitutionalGroup();
    const allGlobalOrgs: OrganizationMetrics[] = [];
    groupedOrgs.forEach(group => {
      allGlobalOrgs.push(...group.organizations);
    });
    return allGlobalOrgs;
  };

  // Get organizations that haven't been assigned to a country or institutional group
  const getUnassignedOrganizations = () => {
    if (!summaryData || !summaryData.predefinedGroups) return [];
    
    // Find groups with empty, null, or "Unknown" country names
    const unassignedGroups = summaryData.predefinedGroups.filter(
      (country: GroupData) => isUnassignedCountry(country.name)
    );
    
    // Flatten all organizations from unassigned groups
    const unassignedOrgs: OrganizationMetrics[] = [];
    unassignedGroups.forEach((group: GroupData) => {
      unassignedOrgs.push(...group.organizations);
    });
    
    return unassignedOrgs;
  };

  // Render organization row with expandable activities
  const renderOrganizationRow = (org: OrganizationMetrics) => {
    const isOrgExpanded = expandedOrgs.has(org.id);
    const orgActivitiesList = orgActivities[org.id] || [];

    return (
      <React.Fragment key={org.id}>
        <tr className="border-b border-border hover:bg-muted/50 bg-muted">
          <td className="py-3 px-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleOrganization(org.id)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title={isOrgExpanded ? "Collapse activities" : "Expand activities"}
                disabled={loadingOrgs.has(org.id)}
              >
                {loadingOrgs.has(org.id) ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : isOrgExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <OrganizationLogo logo={org.logo} name={org.name} size="sm" />
              <a
                href={`/organizations/${org.id}`}
                className="text-left text-blue-700 hover:text-blue-900 hover:underline font-semibold"
              >
                {org.fullName && org.acronym 
                  ? `${org.fullName} (${org.acronym})`
                  : org.name
                }
              </a>
            </div>
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {org.reportedActivities || 0}
          </td>
          <td className="py-3 px-2 text-center font-semibold text-xs text-gray-700">
            {org.providerTransactionCount || 0} / {org.receiverTransactionCount || 0}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(org.financialData['2022'])}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(org.financialData['2023'])}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(org.financialData['2024'])}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(org.financialData['2025'])}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(org.financialData['2026'])}
          </td>
          <td className="py-3 px-2 text-center font-semibold">
            {formatCurrency(org.financialData['2027'])}
          </td>
        </tr>
        {isOrgExpanded && (hideInactiveOrgs 
          ? orgActivitiesList.filter((activity: any) => {
              const years = ['2022', '2023', '2024', '2025', '2026', '2027'];
              return years.some(year => (activity.financialData?.[year] || 0) > 0);
            })
          : orgActivitiesList
        ).map((activity: any) => (
          <tr key={`activity-${activity.id}`} className="hover:bg-muted/50">
            <td className="py-2 px-2 pl-16">
              <div className="flex items-center gap-2">
                <div className="w-3 h-px bg-border"></div>
                {/* Activity Icon */}
                {activity.icon ? (
                  <div className="w-5 h-5 flex-shrink-0 rounded overflow-hidden border border-border bg-card">
                    <img 
                      src={activity.icon} 
                      alt="" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 flex-shrink-0 bg-muted rounded flex items-center justify-center">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <a
                  href={`/activities/${activity.id}`}
                  className="text-left text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                >
                  {activity.activity_title || activity.title || 'Untitled Activity'}
                  {activity.acronym && ` (${activity.acronym})`}
                </a>
              </div>
            </td>
            <td className="py-2 px-2 text-center text-sm">
              {/* Individual activity doesn't show these org-level counts */}
              -
            </td>
            <td className="py-2 px-2 text-center text-sm">
              -
            </td>
            <td className="py-2 px-2 text-center text-sm">
              {formatCurrency(activity.financialData?.['2022'] || 0)}
            </td>
            <td className="py-2 px-2 text-center text-sm">
              {formatCurrency(activity.financialData?.['2023'] || 0)}
            </td>
            <td className="py-2 px-2 text-center text-sm">
              {formatCurrency(activity.financialData?.['2024'] || 0)}
            </td>
            <td className="py-2 px-2 text-center text-sm">
              {formatCurrency(activity.financialData?.['2025'] || 0)}
            </td>
            <td className="py-2 px-2 text-center text-sm">
              {formatCurrency(activity.financialData?.['2026'] || 0)}
            </td>
            <td className="py-2 px-2 text-center text-sm">
              {formatCurrency(activity.financialData?.['2027'] || 0)}
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
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
        <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Partner Summary</h1>
          </div>

          {/* Main Content */}
          <Tabs value={groupBy} onValueChange={(value) => setGroupBy(value as 'type' | 'custom')}>
            <div className="flex items-center justify-between mb-6">
              <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
                <TabsTrigger value="type" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                  <Building2 className="h-4 w-4" />
                  Development Partners
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                  <FolderOpen className="h-4 w-4" />
                  Custom Groups
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, acronym, count..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                {/* Actions */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExpandAll}
                  disabled={expandLevel === 2}
                >
                  {expandLevel === 0 ? 'Expand Countries/Organisations' : expandLevel === 1 ? 'Expand Activities' : 'Expand All'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCollapseAll}
                  disabled={expandLevel === 0 && expandedCountries.size === 0 && expandedOrgs.size === 0}
                >
                  {expandLevel === 2 ? 'Collapse Activities' : 'Collapse All'}
                </Button>
                <Button 
                  variant={hideInactiveOrgs ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHideInactiveOrgs(!hideInactiveOrgs)}
                  title={hideInactiveOrgs ? "Show all organizations" : "Hide organizations with no financial activity"}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {hideInactiveOrgs ? 'Show All' : 'Hide Inactive'}
                </Button>
              </div>
            </div>

            <TabsContent value="type">
              <div className="space-y-4">
                {/* Bilateral Partners Table */}
                <Card className="bg-white border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Bilateral Partners
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Development partners organized by country
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-surface-muted">
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('name')}
                                className="flex items-center hover:text-foreground"
                              >
                                Country / Organisation Name
                                {getSortIcon('name')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('reportedActivities')}
                                className="flex items-center hover:text-foreground"
                              >
                                Reported
                                {getSortIcon('reportedActivities')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('providerReceiver')}
                                className="flex items-center hover:text-foreground"
                              >
                                Provider/Receiver
                                {getSortIcon('providerReceiver')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('2022')}
                                className="flex items-center hover:text-foreground"
                              >
                                {getYearLabel(2022)}
                                {getSortIcon('2022')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('2023')}
                                className="flex items-center hover:text-foreground"
                              >
                                {getYearLabel(2023)}
                                {getSortIcon('2023')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('2024')}
                                className="flex items-center hover:text-foreground"
                              >
                                {getYearLabel(2024)}
                                {getSortIcon('2024')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('2025')}
                                className="flex items-center hover:text-foreground"
                              >
                                {getYearLabel(2025)}
                                {getSortIcon('2025')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('2026')}
                                className="flex items-center hover:text-foreground"
                              >
                                {getYearLabel(2026)}
                                {getSortIcon('2026')}
                              </button>
                            </th>
                            <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                              <button
                                onClick={() => handleSort('2027')}
                                className="flex items-center hover:text-foreground"
                              >
                                {getYearLabel(2027)}
                                {getSortIcon('2027')}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderUnifiedTable()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Institutional Group Cards - One for each group */}
                {getOrganizationsByInstitutionalGroup()
                  .filter(institutionalGroup => filterOrganizations(institutionalGroup.organizations).length > 0)
                  .map((institutionalGroup) => (
                  <Card key={institutionalGroup.name} className="bg-white border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {institutionalGroup.name}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {institutionalGroup.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-surface-muted">
                              <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('name')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  Organisation Name
                                  {getSortIcon('name')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('reportedActivities')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  Reported
                                  {getSortIcon('reportedActivities')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('providerReceiver')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  Provider/Receiver
                                  {getSortIcon('providerReceiver')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2022')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2022)}
                                  {getSortIcon('2022')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2023')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2023)}
                                  {getSortIcon('2023')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2024')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2024)}
                                  {getSortIcon('2024')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2025')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2025)}
                                  {getSortIcon('2025')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2026')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2026)}
                                  {getSortIcon('2026')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2027')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2027)}
                                  {getSortIcon('2027')}
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortOrganizations(filterOrganizations(institutionalGroup.organizations)).map((org) => renderOrganizationRow(org))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Unassigned Organizations Card */}
                {filterOrganizations(getUnassignedOrganizations()).length > 0 && (
                  <Card className="bg-white border border-orange-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Unassigned Organizations
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Organizations that need to be assigned a country or institutional group
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('name')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  Organisation Name
                                  {getSortIcon('name')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('reportedActivities')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  Reported
                                  {getSortIcon('reportedActivities')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('providerReceiver')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  Provider/Receiver
                                  {getSortIcon('providerReceiver')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2022')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2022)}
                                  {getSortIcon('2022')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2023')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2023)}
                                  {getSortIcon('2023')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2024')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2024)}
                                  {getSortIcon('2024')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2025')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2025)}
                                  {getSortIcon('2025')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2026')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2026)}
                                  {getSortIcon('2026')}
                                </button>
                              </th>
                              <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                <button
                                  onClick={() => handleSort('2027')}
                                  className="flex items-center hover:text-foreground"
                                >
                                  {getYearLabel(2027)}
                                  {getSortIcon('2027')}
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortOrganizations(filterOrganizations(getUnassignedOrganizations())).map((org) => renderOrganizationRow(org))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom">
              <div className="space-y-4">
                {summaryData.customGroups.length === 0 ? (
                  <Card className="bg-white border border-border">
                    <CardContent className="py-12 text-center">
                      <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Custom Groups</h3>
                      <p className="text-muted-foreground mb-4">
                        Create custom organization groups to organize partners by your own criteria.
                      </p>
                      <Button onClick={() => router.push('/partners/groups')}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Manage Groups
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  summaryData.customGroups.map((group: GroupData) => {
                    const isExpanded = expandedGroups.has(group.id);
                    const filteredOrgs = filterOrganizations(group.organizations);
                    const sortedOrgs = sortOrganizations(filteredOrgs);

                    return (
                      <Card key={group.id} className="bg-white border border-border">
                        <CardHeader 
                          className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div className="flex items-center justify-between">
                                                         <div className="flex items-center gap-3">
                               {isExpanded ? (
                                 <ChevronDown className="h-4 w-4 text-muted-foreground" />
                               ) : (
                                 <ChevronRight className="h-4 w-4 text-muted-foreground" />
                               )}
                               {group.logo ? (
                                 <img 
                                   src={group.logo} 
                                   alt={group.name}
                                   className="h-8 w-8 object-contain rounded"
                                 />
                               ) : (
                                 <FolderOpen className="h-5 w-5 text-blue-600" />
                               )}
                              <div>
                                <CardTitle className="text-lg font-semibold text-foreground">
                                  {group.name}
                                </CardTitle>
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
                              <div className="text-center py-8 text-muted-foreground">
                                {searchTerm ? 'No organizations match your search' : 'No organizations in this group'}
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('name')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          Organisation Name
                                          {getSortIcon('name')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('reportedActivities')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          Reported
                                          {getSortIcon('reportedActivities')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('providerReceiver')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          Provider/Receiver
                                          {getSortIcon('providerReceiver')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('2022')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          {getYearLabel(2022)}
                                          {getSortIcon('2022')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('2023')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          {getYearLabel(2023)}
                                          {getSortIcon('2023')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('2024')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          {getYearLabel(2024)}
                                          {getSortIcon('2024')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('2025')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          {getYearLabel(2025)}
                                          {getSortIcon('2025')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('2026')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          {getYearLabel(2026)}
                                          {getSortIcon('2026')}
                                        </button>
                                      </th>
                                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                                        <button
                                          onClick={() => handleSort('2027')}
                                          className="flex items-center hover:text-foreground"
                                        >
                                          {getYearLabel(2027)}
                                          {getSortIcon('2027')}
                                        </button>
                                      </th>
                                    </tr>
                                  </thead>
                                                                  <tbody>
                                  {sortedOrgs.map((org) => renderOrganizationRow(org))}
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
                  <label className="text-sm font-medium text-slate-700">Activities</label>
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