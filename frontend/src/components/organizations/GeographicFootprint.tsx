"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe,
  MapPin,
  Building2,
  Activity
} from "lucide-react";

interface ActivityData {
  id: string;
  title: string;
  activity_status: string;
  role: string;
  locations?: Array<{
    country: string;
    country_code?: string;
    region?: string;
    administrative_level?: string;
  }>;
}

interface OrganizationData {
  country?: string;
  country_represented?: string;
  activities?: ActivityData[];
}

interface GeographicFootprintProps {
  organization: OrganizationData;
}

interface CountryData {
  country: string;
  activityCount: number;
  roles: Set<string>;
  statuses: Set<string>;
}

export const GeographicFootprint: React.FC<GeographicFootprintProps> = ({
  organization
}) => {
  const geographicData = useMemo(() => {
    const activities = organization.activities || [];
    const countryMap = new Map<string, CountryData>();

    // Add organization's base countries
    const baseCountries = [organization.country, organization.country_represented].filter(Boolean) as string[];
    baseCountries.forEach((country: string) => {
      if (!countryMap.has(country)) {
        countryMap.set(country, {
          country,
          activityCount: 0,
          roles: new Set(),
          statuses: new Set()
        });
      }
    });

    // Process activities to extract geographic information
    activities.forEach((activity: ActivityData) => {
      // If activity has location data, use it
      if (activity.locations && activity.locations.length > 0) {
        activity.locations.forEach(location => {
          const country = location.country;
          if (country) {
            if (!countryMap.has(country)) {
              countryMap.set(country, {
                country,
                activityCount: 0,
                roles: new Set(),
                statuses: new Set()
              });
            }
            const countryData = countryMap.get(country)!;
            countryData.activityCount++;
            countryData.roles.add(activity.role);
            countryData.statuses.add(activity.activity_status);
          }
        });
      } else {
        // Fallback to organization's base country for activities without specific location
        baseCountries.forEach((country: string) => {
          const countryData = countryMap.get(country);
          if (countryData) {
            countryData.activityCount++;
            countryData.roles.add(activity.role);
            countryData.statuses.add(activity.activity_status);
          }
        });
      }
    });

    const countries = Array.from(countryMap.values()).sort((a, b) => b.activityCount - a.activityCount);
    
    return {
      countries,
      totalCountries: countries.length,
      totalActivities: activities.length,
      primaryCountry: baseCountries[0] || 'Not specified'
    };
  }, [organization]);

  const getRoleColor = () => {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusColor = () => {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Geographic Footprint
          <Badge variant="outline" className="ml-2">
            {geographicData.totalCountries} {geographicData.totalCountries === 1 ? 'Country' : 'Countries'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Globe className="h-6 w-6 mx-auto mb-2 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{geographicData.totalCountries}</p>
              <p className="text-sm text-slate-600">Countries</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Activity className="h-6 w-6 mx-auto mb-2 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{geographicData.totalActivities}</p>
              <p className="text-sm text-slate-600">Total Activities</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-slate-500" />
              <p className="text-lg font-bold text-slate-900">{geographicData.primaryCountry}</p>
              <p className="text-sm text-slate-600">Primary Country</p>
            </div>
          </div>

          {/* Country List */}
          {geographicData.countries.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Countries of Operation</h4>
              <div className="space-y-3">
                {geographicData.countries.map((countryData, index) => (
                  <div key={countryData.country} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <h5 className="font-medium text-gray-900">{countryData.country}</h5>
                        {index === 0 && countryData.country === geographicData.primaryCountry && (
                          <Badge variant="outline" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{countryData.activityCount}</p>
                        <p className="text-xs text-gray-500">
                          {countryData.activityCount === 1 ? 'Activity' : 'Activities'}
                        </p>
                      </div>
                    </div>

                    {/* Roles */}
                    {countryData.roles.size > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-600 mb-1">Roles:</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(countryData.roles).map((role: string) => (
                            <Badge 
                              key={role} 
                              variant="outline" 
                              className={`text-xs ${getRoleColor(role)}`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activity Statuses */}
                    {countryData.statuses.size > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Activity Status:</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(countryData.statuses).map((status: string) => (
                            <Badge 
                              key={status} 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(status)}`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No geographic data available</p>
              <p className="text-sm">Add location information to activities to see geographic footprint</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};