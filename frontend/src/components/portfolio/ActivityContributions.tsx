"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Users,
  ExternalLink,
  Filter,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from "lucide-react";
import Link from "next/link";

interface ActivityContribution {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'planning' | 'cancelled';
  role: 'implementing' | 'funding' | 'extending' | 'government';
  budget: number;
  currency: string;
  startDate: string;
  endDate: string;
  location: string;
  organization: string;
  lastUpdated: string;
  description?: string;
}

interface ActivityContributionsProps {
  contributions: ActivityContribution[];
  userRole?: string;
}

export function ActivityContributions({ contributions, userRole }: ActivityContributionsProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for demonstration
  const mockContributions: ActivityContribution[] = [
    {
      id: "1",
      title: "Rural Health Systems Strengthening",
      status: "active",
      role: "implementing",
      budget: 2500000,
      currency: "USD",
      startDate: "2024-01-15",
      endDate: "2026-12-31",
      location: "Northern Province",
      organization: "Ministry of Health",
      lastUpdated: "2024-01-20",
      description: "Comprehensive program to strengthen health systems in rural areas"
    },
    {
      id: "2", 
      title: "Education Infrastructure Development",
      status: "completed",
      role: "funding",
      budget: 1800000,
      currency: "USD",
      startDate: "2022-03-01",
      endDate: "2024-02-28",
      location: "Eastern Region",
      organization: "Department of Education",
      lastUpdated: "2024-02-28",
      description: "Construction and renovation of primary schools"
    },
    {
      id: "3",
      title: "Climate Resilience Initiative", 
      status: "planning",
      role: "extending",
      budget: 3200000,
      currency: "USD",
      startDate: "2024-06-01",
      endDate: "2027-05-31",
      location: "Coastal Areas",
      organization: "Environmental Authority",
      lastUpdated: "2024-01-18",
      description: "Building climate resilience in vulnerable coastal communities"
    }
  ];

  const allContributions = contributions.length > 0 ? contributions : mockContributions;

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'planning': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    return 'bg-gray-100 text-gray-800';
  };

  const filteredContributions = allContributions.filter(contribution => {
    const matchesSearch = contribution.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contribution.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || contribution.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getTabCounts = () => {
    return {
      all: allContributions.length,
      active: allContributions.filter(c => c.status === 'active').length,
      completed: allContributions.filter(c => c.status === 'completed').length,
      planning: allContributions.filter(c => c.status === 'planning').length,
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              My Activity Contributions
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-2 border rounded-md text-sm w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({tabCounts.all})</TabsTrigger>
          <TabsTrigger value="active">Active ({tabCounts.active})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({tabCounts.completed})</TabsTrigger>
          <TabsTrigger value="planning">Planning ({tabCounts.planning})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredContributions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No activities found</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm 
                    ? "Try adjusting your search terms"
                    : "You haven't contributed to any activities in this category yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredContributions.map((contribution) => (
                <Card key={contribution.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{contribution.title}</h3>
                          <Badge className={`${getStatusColor(contribution.status)} border-0`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(contribution.status)}
                              {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                            </span>
                          </Badge>
                          <Badge className={`${getRoleColor(contribution.role)} border-0`}>
                            {contribution.role.charAt(0).toUpperCase() + contribution.role.slice(1)}
                          </Badge>
                        </div>
                        
                        {contribution.description && (
                          <p className="text-muted-foreground mb-3">{contribution.description}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{formatCurrency(contribution.budget, contribution.currency)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(contribution.startDate)} - {formatDate(contribution.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{contribution.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{contribution.organization}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xs text-muted-foreground">
                            Last updated: {formatDate(contribution.lastUpdated)}
                          </span>
                          <Link href={`/activities/${contribution.id}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Contribution Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{tabCounts.all}</div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(allContributions.reduce((sum, c) => sum + c.budget, 0))}
              </div>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {new Set(allContributions.map(c => c.organization)).size}
              </div>
              <p className="text-sm text-muted-foreground">Partner Organizations</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {new Set(allContributions.map(c => c.location)).size}
              </div>
              <p className="text-sm text-muted-foreground">Geographic Areas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}