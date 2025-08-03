import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { MapPin, AlertCircle, Globe } from 'lucide-react';

interface SubnationalBreakdownTabProps {
  activityId: string;
  canEdit: boolean;
  onDataChange: (data: Record<string, number>) => void;
}

export function SubnationalBreakdownTab({ 
  activityId, 
  canEdit, 
  onDataChange 
}: SubnationalBreakdownTabProps) {
  const [breakdowns, setBreakdowns] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNational, setIsNational] = useState(false);

  // Mock regions for demonstration - in a real app, this would come from an API
  const regions = [
    { name: 'Ayeyarwady Region', type: 'Region' },
    { name: 'Bago Region', type: 'Region' },
    { name: 'Chin State', type: 'State' },
    { name: 'Kachin State', type: 'State' },
    { name: 'Kayah State', type: 'State' },
    { name: 'Kayin State', type: 'State' },
    { name: 'Magway Region', type: 'Region' },
    { name: 'Mandalay Region', type: 'Region' },
    { name: 'Mon State', type: 'State' },
    { name: 'Naypyitaw Union Territory', type: 'Union Territory' },
    { name: 'Rakhine State', type: 'State' },
    { name: 'Sagaing Region', type: 'Region' },
    { name: 'Shan State', type: 'State' },
    { name: 'Tanintharyi Region', type: 'Region' },
    { name: 'Yangon Region', type: 'Region' }
  ];

  useEffect(() => {
    // Load existing breakdown data
    loadBreakdownData();
  }, [activityId]);

  const loadBreakdownData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from your API
      // For now, we'll use mock data
      const mockData = {
        'Yangon Region': 25,
        'Mandalay Region': 20,
        'Sagaing Region': 15,
        'Ayeyarwady Region': 10,
        'Bago Region': 10,
        'Magway Region': 10,
        'Shan State': 5,
        'Kachin State': 5
      };
      setBreakdowns(mockData);
    } catch (err) {
      setError('Failed to load subnational breakdown data');
    } finally {
      setLoading(false);
    }
  };

  const handleBreakdownChange = (regionName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newBreakdowns = { ...breakdowns, [regionName]: numValue };
    setBreakdowns(newBreakdowns);
    onDataChange(newBreakdowns);
  };

  const calculateTotal = () => {
    return Object.values(breakdowns).reduce((sum, value) => sum + value, 0);
  };

  const handleAutoDistribute = () => {
    // Distribute 100% equally across all regions
    const evenDistribution = 100 / regions.length;
    const newBreakdowns: Record<string, number> = {};
    
    // Distribute to all regions except the last one
    regions.slice(0, -1).forEach(region => {
      newBreakdowns[region.name] = Math.round(evenDistribution * 100) / 100;
    });
    
    // Put the remainder in the last region to ensure exact 100%
    const lastRegion = regions[regions.length - 1];
    const distributedSoFar = Object.values(newBreakdowns).reduce((sum, val) => sum + val, 0);
    newBreakdowns[lastRegion.name] = Math.round((100 - distributedSoFar) * 100) / 100;
    
    setBreakdowns(newBreakdowns);
    onDataChange(newBreakdowns);
  };

  const handleNationalToggle = (checked: boolean) => {
    setIsNational(checked);
    if (checked) {
      // Set all regions to equal distribution
      handleAutoDistribute();
    } else {
      // Clear all breakdowns
      setBreakdowns({});
      onDataChange({});
    }
  };

  const total = calculateTotal();
  // Use tolerance for floating-point precision issues
  const isValid = Math.abs(total - 100) < 0.01 || total === 0;

  // Split regions into two columns
  const midPoint = Math.ceil(regions.length / 2);
  const leftColumn = regions.slice(0, midPoint);
  const rightColumn = regions.slice(midPoint);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Regional Breakdown
        </h3>
        <p className="text-sm text-gray-600">
          Estimate what percentage of this activity's impact or budget benefits each region, or select if the activity benefits the entire country.
        </p>
      </div>

      {/* Nationwide Toggle */}
      <Card className="border border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-gray-600" />
              <div>
                <Label htmlFor="national-toggle" className="text-sm font-medium">
                  Nationwide
                </Label>
                <p className="text-xs text-gray-500">
                  Activity benefits the entire country
                </p>
              </div>
            </div>
            <Switch
              id="national-toggle"
              checked={isNational}
              onCheckedChange={handleNationalToggle}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Regional Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(14)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {leftColumn.map((region) => (
                  <Card key={region.name} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {region.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {region.type}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={breakdowns[region.name] || ''}
                            onChange={(e) => handleBreakdownChange(region.name, e.target.value)}
                            disabled={!canEdit || isNational}
                            className="w-20 h-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {rightColumn.map((region) => (
                  <Card key={region.name} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {region.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {region.type}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={breakdowns[region.name] || ''}
                            onChange={(e) => handleBreakdownChange(region.name, e.target.value)}
                            disabled={!canEdit || isNational}
                            className="w-20 h-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Allocation:</span>
              <span className={`text-lg font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {total.toFixed(1)}%
              </span>
            </div>
            
            {!isValid && total > 0 && Math.abs(total - 100) >= 0.01 && (
              <p className="text-sm text-red-600 mt-2">
                Total allocation must equal 100% (currently {total.toFixed(1)}%)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {canEdit && !isNational && (
        <div className="flex gap-2">
          <Button 
            onClick={() => setBreakdowns({})}
            variant="outline"
            size="sm"
          >
            Clear All
          </Button>
          <Button 
            onClick={handleAutoDistribute}
            variant="outline"
            size="sm"
          >
            Auto-Distribute
          </Button>
        </div>
      )}
    </div>
  );
} 