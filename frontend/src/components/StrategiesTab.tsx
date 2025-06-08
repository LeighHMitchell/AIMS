"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  FileText, 
  Calendar, 
  Users, 
  Eye, 
  EyeOff,
  Edit2,
  Trash2,
  Download,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import StrategiesGanttChart from './StrategiesGanttChart';

interface Strategy {
  id: string;
  title: string;
  document_type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  start_year?: number;
  end_year?: number;
  thematic_pillars?: string[];
  languages?: string[];
  public_link?: string;
  notes?: string;
  has_file: boolean;
  file_name?: string;
  file_url?: string;
  public: boolean;
  government_counterparts?: string[];
  expected_publication_date?: string;
  created_at: string;
  updated_at: string;
  organization: {
    id: string;
    name: string;
    acronym?: string;
  };
  created_by_user: {
    id: string;
    name: string;
  };
  last_edited_by_user?: {
    id: string;
    name: string;
  };
}

interface StrategiesTabProps {
  organizationId: string;
  organizationName: string;
  isPublicView?: boolean;
  userCanEdit?: boolean;
}

const StrategiesTab: React.FC<StrategiesTabProps> = ({
  organizationId,
  organizationName,
  isPublicView = false,
  userCanEdit = false
}) => {
  const { user } = useUser();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        organizationId,
        publicOnly: isPublicView.toString(),
        ...(user?.id && { userId: user.id })
      });

      const response = await fetch(`/api/strategies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStrategies(data);
      } else {
        console.error('Failed to fetch strategies');
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, [organizationId, isPublicView, user?.id]);

  const handleCreateStrategy = () => {
    setEditingStrategy(null);
    setShowForm(true);
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setShowForm(true);
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!user?.id || !confirm('Are you sure you want to delete this strategy?')) return;

    try {
      const response = await fetch(`/api/strategies?id=${strategyId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchStrategies();
      } else {
        console.error('Failed to delete strategy');
      }
    } catch (error) {
      console.error('Error deleting strategy:', error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Draft – Internal Only': return 'bg-yellow-100 text-yellow-800';
      case 'Under Government Consultation': return 'bg-orange-100 text-orange-800';
      case 'Pending Publication / Approval': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateRange = (strategy: Strategy) => {
    if (strategy.start_date && strategy.end_date) {
      return `${new Date(strategy.start_date).getFullYear()} - ${new Date(strategy.end_date).getFullYear()}`;
    }
    if (strategy.start_year && strategy.end_year) {
      return `${strategy.start_year} - ${strategy.end_year}`;
    }
    return 'Date TBD';
  };

  const publishedStrategies = strategies.filter(s => s.public && s.has_file);
  const draftStrategies = strategies.filter(s => !s.public || !s.has_file);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Development Strategies</h2>
          <p className="text-gray-600 mt-1">
            {isPublicView 
              ? `Published strategies from ${organizationName}` 
              : `Manage development strategies for ${organizationName}`
            }
          </p>
        </div>
        
        {userCanEdit && !isPublicView && (
          <Button onClick={handleCreateStrategy} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Strategy
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {!isPublicView && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{strategies.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Published</p>
                  <p className="text-2xl font-bold">{publishedStrategies.length}</p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Draft/Internal</p>
                  <p className="text-2xl font-bold">{draftStrategies.length}</p>
                </div>
                <EyeOff className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">With Files</p>
                  <p className="text-2xl font-bold">{strategies.filter(s => s.has_file).length}</p>
                </div>
                <Download className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="gantt">Timeline View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {strategies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies found</h3>
                <p className="text-gray-600 mb-4">
                  {isPublicView 
                    ? "This organization hasn't published any development strategies yet."
                    : "Get started by adding your first development strategy."
                  }
                </p>
                {userCanEdit && !isPublicView && (
                  <Button onClick={handleCreateStrategy}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Strategy
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {strategies.map((strategy) => (
                <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {strategy.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <span>{strategy.document_type}</span>
                              <span>•</span>
                              <span>{formatDateRange(strategy)}</span>
                              {!strategy.public && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <EyeOff className="h-3 w-3" />
                                    Internal Only
                                  </span>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className={getStatusBadgeColor(strategy.status)}>
                                {strategy.status}
                              </Badge>
                              {strategy.has_file && (
                                <Badge variant="outline">
                                  <FileText className="h-3 w-3 mr-1" />
                                  File Attached
                                </Badge>
                              )}
                            </div>

                            {strategy.thematic_pillars && strategy.thematic_pillars.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {strategy.thematic_pillars.map((pillar, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {pillar}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="text-sm text-gray-600">
                              Created by {strategy.created_by_user.name} on{' '}
                              {new Date(strategy.created_at).toLocaleDateString()}
                              {strategy.last_edited_by_user && (
                                <span>
                                  {' '}• Last edited by {strategy.last_edited_by_user.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {strategy.public_link && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(strategy.public_link, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {strategy.has_file && strategy.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(strategy.file_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}

                        {userCanEdit && !isPublicView && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStrategy(strategy)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteStrategy(strategy.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="gantt">
          <StrategiesGanttChart 
            strategies={strategies}
            isPublicView={isPublicView}
          />
        </TabsContent>
      </Tabs>

      {/* Strategy Form Dialog - Coming Soon */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-medium mb-4">Strategy Management</h3>
            <p className="text-gray-600 mb-4">
              Strategy creation and editing functionality will be available soon.
            </p>
            <Button onClick={() => setShowForm(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategiesTab; 