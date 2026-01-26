import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, Building2, Loader2 } from 'lucide-react';
import { getContactTypeCategories } from './utils/roleLabels';
import { apiFetch } from '@/lib/api-fetch';

interface ContactTypeStats {
  contact_type: string;
  count: number;
}

interface RolodexStatsProps {
  totalCount?: number;
  filters?: any;
}

export function RolodexStats({ totalCount = 0, filters }: RolodexStatsProps) {
  const [stats, setStats] = useState<ContactTypeStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiFetch('/api/rolodex/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats || []);
        }
      } catch (error) {
        console.error('Error fetching rolodex stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'activity_contact':
        return <Activity className="h-4 w-4" />;
      case 'organization_contact':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getLabelForType = (type: string) => {
    const categories = getContactTypeCategories();
    const sourceKey = type === 'user' ? 'system_users' : 
                     type === 'activity_contact' ? 'activity_contacts' :
                     'organization_contacts';
    
    const category = categories.find(cat => cat.key === sourceKey);
    return category?.label || type;
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'activity_contact':
        return 'bg-purple-100 text-purple-800';
      case 'organization_contact':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-600">Loading stats...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Contact Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Total count */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="font-medium text-slate-700">Total Contacts</span>
            <Badge variant="secondary" className="text-lg font-semibold">
              {totalCount.toLocaleString()}
            </Badge>
          </div>

          {/* Breakdown by type */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-600 mb-2">By Contact Type</div>
            {stats.map((stat) => (
              <div key={stat.contact_type} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  {getIconForType(stat.contact_type)}
                  <span className="text-sm font-medium text-slate-700">
                    {getLabelForType(stat.contact_type)}
                  </span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getColorForType(stat.contact_type)}`}
                >
                  {stat.count.toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>

          {/* Active filters indicator */}
          {filters && Object.keys(filters).some(key => 
            filters[key] !== undefined && 
            filters[key] !== null && 
            filters[key] !== '' && 
            key !== 'page' && 
            key !== 'limit'
          ) && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                * Results filtered by active criteria
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
